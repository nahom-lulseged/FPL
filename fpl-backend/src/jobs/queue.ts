import { Queue, Worker, type Job, type WorkerOptions } from 'bullmq';
import { redisUrl } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { processLiveStatsPoll } from './liveStatsPoll.job';
import { processPriceChangeSync } from './priceChange.job';
import { processDeadlineReminder } from './deadlineReminder.job';
import { processGameweekFinalization } from './gameweekFinalization.job';
import { processBootstrapSync } from './bootstrapSync.job';
import { processReconciliation } from './reconciliation.job';
import { processFraudDetection } from './fraudDetection.job';
import { processPayoutDistribution } from './payoutDistribution.job';
import { processElementSummaryBackfill } from './elementSummaryBackfill.job';

export const QUEUE_NAMES = {
  LIVE_STATS: 'live-stats',
  BOOTSTRAP: 'bootstrap-sync',
  PRICE_CHANGE: 'price-change',
  DEADLINE_REMINDER: 'deadline-reminder',
  GAMEWEEK_FINALIZATION: 'gameweek-finalization',
  RECONCILIATION: 'reconciliation',
  FRAUD_DETECTION: 'fraud-detection',
  PAYOUT_DISTRIBUTION: 'payout-distribution',
  ELEMENT_SUMMARY_BACKFILL: 'element-summary-backfill',
} as const;

type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface QueueDepth {
  name: string;
  active: number;
  waiting: number;
  failed: number;
  delayed: number;
}

const workers: Worker[] = [];
const queueByName = new Map<QueueName, Queue>();

function getConnection() {
  return {
    url: redisUrl,
    maxRetriesPerRequest: null,
  };
}

export function getQueue(name: QueueName): Queue {
  const existing = queueByName.get(name);
  if (existing) {
    return existing;
  }

  const queue = new Queue(name, { connection: getConnection() });
  queueByName.set(name, queue);
  return queue;
}

function createWorker(
  name: QueueName,
  processor: (job: Job) => Promise<void>,
  options: Omit<WorkerOptions, 'connection'> = {},
): Worker {
  const worker = new Worker(name, processor, {
    connection: getConnection(),
    ...options,
  });

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id, queue: name }, 'BullMQ job failed');
    if (name === QUEUE_NAMES.BOOTSTRAP) {
      const message = err instanceof Error ? err.message : 'Bootstrap sync job failed';
      void import('../modules/admin/system/alert.service').then(({ notifyIngestionFailure }) =>
        notifyIngestionFailure(message),
      );
    }
  });

  workers.push(worker);
  return worker;
}

export function registerWorkers(): void {
  createWorker(QUEUE_NAMES.LIVE_STATS, async () => {
    await processLiveStatsPoll();
  });

  createWorker(QUEUE_NAMES.BOOTSTRAP, async () => {
    await processBootstrapSync();
  });

  createWorker(QUEUE_NAMES.PRICE_CHANGE, async () => {
    await processPriceChangeSync();
  });

  createWorker(QUEUE_NAMES.DEADLINE_REMINDER, async () => {
    await processDeadlineReminder();
  });

  createWorker(QUEUE_NAMES.GAMEWEEK_FINALIZATION, async (job) => {
    const { previousGameweekNumber, newGameweekNumber } = job.data as {
      previousGameweekNumber: number;
      newGameweekNumber: number;
    };
    await processGameweekFinalization(previousGameweekNumber, newGameweekNumber);
  });

  createWorker(QUEUE_NAMES.RECONCILIATION, async () => {
    await processReconciliation();
  });

  createWorker(QUEUE_NAMES.FRAUD_DETECTION, async () => {
    await processFraudDetection();
  });

  createWorker(QUEUE_NAMES.PAYOUT_DISTRIBUTION, async (job) => {
    await processPayoutDistribution(job.data as Parameters<typeof processPayoutDistribution>[0]);
  });

  createWorker(
    QUEUE_NAMES.ELEMENT_SUMMARY_BACKFILL,
    async (job) => {
      await processElementSummaryBackfill(
        job.data as { limit?: number; delayMs?: number } | undefined,
      );
    },
    { concurrency: 1 },
  );

  logger.info('BullMQ workers registered');
}

export async function scheduleRepeatableJobs(): Promise<void> {
  const liveStatsQueue = getQueue(QUEUE_NAMES.LIVE_STATS);
  const bootstrapQueue = getQueue(QUEUE_NAMES.BOOTSTRAP);
  const priceChangeQueue = getQueue(QUEUE_NAMES.PRICE_CHANGE);
  const deadlineQueue = getQueue(QUEUE_NAMES.DEADLINE_REMINDER);
  const reconciliationQueue = getQueue(QUEUE_NAMES.RECONCILIATION);
  const fraudQueue = getQueue(QUEUE_NAMES.FRAUD_DETECTION);

  const repeatableJobs = [
    ...(await liveStatsQueue.getRepeatableJobs()),
    ...(await bootstrapQueue.getRepeatableJobs()),
    ...(await priceChangeQueue.getRepeatableJobs()),
    ...(await deadlineQueue.getRepeatableJobs()),
    ...(await reconciliationQueue.getRepeatableJobs()),
    ...(await fraudQueue.getRepeatableJobs()),
  ];

  for (const job of repeatableJobs) {
    const queueMap: Record<string, Queue> = {
      [QUEUE_NAMES.LIVE_STATS]: liveStatsQueue,
      [QUEUE_NAMES.BOOTSTRAP]: bootstrapQueue,
      [QUEUE_NAMES.PRICE_CHANGE]: priceChangeQueue,
      [QUEUE_NAMES.DEADLINE_REMINDER]: deadlineQueue,
      [QUEUE_NAMES.RECONCILIATION]: reconciliationQueue,
      [QUEUE_NAMES.FRAUD_DETECTION]: fraudQueue,
    };
    const queue = queueMap[job.name] ?? deadlineQueue;
    await queue.removeRepeatableByKey(job.key);
  }

  await liveStatsQueue.add(
    'poll',
    {},
    {
      repeat: { pattern: env.LIVE_STATS_POLL_CRON },
      jobId: 'live-stats-poll',
    },
  );

  await bootstrapQueue.add(
    'sync',
    {},
    {
      repeat: { pattern: env.INGESTION_CRON_BOOTSTRAP },
      jobId: 'bootstrap-sync',
    },
  );

  await priceChangeQueue.add(
    'sync',
    {},
    {
      repeat: { pattern: env.PRICE_CHANGE_CRON },
      jobId: 'price-change-sync',
    },
  );

  await deadlineQueue.add(
    'remind',
    {},
    {
      repeat: { pattern: env.DEADLINE_REMINDER_CRON },
      jobId: 'deadline-reminder',
    },
  );

  await reconciliationQueue.add(
    'reconcile',
    {},
    {
      repeat: { pattern: env.RECONCILIATION_CRON },
      jobId: 'ledger-reconciliation',
    },
  );

  await fraudQueue.add(
    'detect',
    {},
    {
      repeat: { pattern: env.FRAUD_DETECTION_CRON },
      jobId: 'fraud-detection',
    },
  );

  logger.info(
    {
      liveStats: env.LIVE_STATS_POLL_CRON,
      priceChange: env.PRICE_CHANGE_CRON,
      deadlineReminder: env.DEADLINE_REMINDER_CRON,
    },
    'BullMQ repeatable jobs scheduled',
  );
}

export async function enqueueGameweekFinalization(
  previousGameweekNumber: number,
  newGameweekNumber: number,
): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.GAMEWEEK_FINALIZATION);
  await queue.add(
    'finalize',
    { previousGameweekNumber, newGameweekNumber },
    {
      jobId: `finalize-gw-${previousGameweekNumber}-to-${newGameweekNumber}`,
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

export async function enqueueElementSummaryBackfill(options?: {
  limit?: number;
  delayMs?: number;
}): Promise<{ jobId: string }> {
  const queue = getQueue(QUEUE_NAMES.ELEMENT_SUMMARY_BACKFILL);
  const job = await queue.add(
    'backfill',
    { limit: options?.limit, delayMs: options?.delayMs },
    {
      removeOnComplete: true,
      removeOnFail: 50,
    },
  );
  return { jobId: String(job.id) };
}

export function getAllQueues(): Queue[] {
  if (!env.ENABLE_BULLMQ) {
    return [];
  }

  return Object.values(QUEUE_NAMES).map((name) => getQueue(name));
}

export async function getQueueDepths(): Promise<QueueDepth[]> {
  if (!env.ENABLE_BULLMQ) {
    return [];
  }

  const queues = getAllQueues();
  return Promise.all(
    queues.map(async (queue) => {
      const counts = await queue.getJobCounts('active', 'waiting', 'failed', 'delayed');
      return {
        name: queue.name,
        active: counts.active ?? 0,
        waiting: counts.waiting ?? 0,
        failed: counts.failed ?? 0,
        delayed: counts.delayed ?? 0,
      };
    }),
  );
}

export async function shutdownQueues(): Promise<void> {
  await Promise.all(workers.map((worker) => worker.close()));
  await Promise.all([...queueByName.values()].map((queue) => queue.close()));
  workers.length = 0;
  queueByName.clear();
  logger.info('BullMQ workers and queues shut down');
}
