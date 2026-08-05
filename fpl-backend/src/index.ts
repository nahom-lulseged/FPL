import http from 'http';
import { env } from './config/env';
import { logger } from './lib/logger';

async function main(): Promise<void> {
  logger.info('Using hosted Redis/Key Value service');

  const { ensureMongoSparseIndexes } = await import('./lib/ensureMongoSparseIndexes');
  await ensureMongoSparseIndexes();

  const { default: app } = await import('./app');
  const { startIngestionCron } = await import('./modules/ingestion/ingestion.job');
  const { startScoringCron } = await import('./modules/scoring/scoring.job');

  const server = http.createServer(app);

  if (env.ENABLE_SOCKET_IO) {
    const { initSocketServer } = await import('./sockets/socketServer');
    initSocketServer(server);
  }

  await new Promise<void>((resolve) => {
    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'Server started');
      resolve();
    });
  });

  let stopIngestionCron: (() => void) | undefined;
  let stopScoringCron: (() => void) | undefined;
  let shutdownQueues: (() => Promise<void>) | undefined;
  let alertInterval: ReturnType<typeof setInterval> | undefined;

  if (env.ENABLE_BULLMQ) {
    const {
      scheduleRepeatableJobs,
      shutdownQueues: closeQueues,
    } = await import('./jobs/queue');
    const { checkQueueBackupAlerts, checkHighErrorRate } = await import(
      './modules/admin/system/alert.service'
    );

    await scheduleRepeatableJobs();
    shutdownQueues = closeQueues;

    alertInterval = setInterval(() => {
      void checkQueueBackupAlerts();
      void checkHighErrorRate();
    }, 5 * 60 * 1000);
  } else {
    if (env.ENABLE_INGESTION_CRON) {
      stopIngestionCron = startIngestionCron();
    }

    if (env.ENABLE_SCORING_CRON) {
      stopScoringCron = startScoringCron();
    }
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    if (alertInterval) {
      clearInterval(alertInterval);
    }
    stopIngestionCron?.();
    stopScoringCron?.();
    if (shutdownQueues) {
      await shutdownQueues();
    }
    if (env.ENABLE_SOCKET_IO) {
      const { shutdownSocketServer } = await import('./sockets/socketServer');
      await shutdownSocketServer();
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
