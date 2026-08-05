import { getQueue, QUEUE_NAMES } from './queue';
import { commitPayoutDistribution } from '../modules/staked-leagues/payoutCalculator.service';
import type { PayoutPreview } from '../modules/staked-leagues/payoutCalculator.service';
import { logger } from '../lib/logger';

export interface PayoutDistributionJobData {
  leagueId: string;
  preview: PayoutPreview;
  idempotencyKey: string;
}

export async function processPayoutDistribution(job: PayoutDistributionJobData): Promise<void> {
  await commitPayoutDistribution(job.leagueId, job.preview, job.idempotencyKey);
  logger.info({ leagueId: job.leagueId }, 'Payout distribution job completed');
}

export async function enqueuePayoutDistribution(data: PayoutDistributionJobData): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.PAYOUT_DISTRIBUTION);
  await queue.add('distribute', data, {
    jobId: data.idempotencyKey,
    removeOnComplete: true,
  });
}
