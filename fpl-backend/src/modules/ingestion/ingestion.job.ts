import cron from 'node-cron';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { recordIngestionSync } from './ingestion.status';
import { notifyIngestionFailure } from '../admin/system/alert.service';
import {
  syncFixtures,
  syncGameweekStats,
  syncGameweeks,
  syncPlayers,
  syncRealTeams,
} from './ingestion.service';

type CronTask = ReturnType<typeof cron.schedule>;

export function startIngestionCron(): () => void {
  const tasks: CronTask[] = [];

  const bootstrapTask = cron.schedule(env.INGESTION_CRON_BOOTSTRAP, async () => {
    try {
      logger.info('Running scheduled bootstrap + fixtures sync');
      await syncRealTeams();
      await syncPlayers();
      await syncGameweeks();
      await syncFixtures();
      await recordIngestionSync(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scheduled bootstrap/fixtures sync failed';
      logger.error({ err }, 'Scheduled bootstrap/fixtures sync failed');
      await recordIngestionSync(false, message);
      void notifyIngestionFailure(message);
    }
  });
  tasks.push(bootstrapTask);

  const statsTask = cron.schedule(env.INGESTION_CRON_STATS, async () => {
    try {
      logger.info('Running scheduled stats + price sync');
      await syncPlayers();
      await syncGameweekStats();
      await recordIngestionSync(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scheduled stats sync failed';
      logger.error({ err }, 'Scheduled stats sync failed');
      await recordIngestionSync(false, message);
      void notifyIngestionFailure(message);
    }
  });
  tasks.push(statsTask);

  logger.info(
    {
      bootstrap: env.INGESTION_CRON_BOOTSTRAP,
      stats: env.INGESTION_CRON_STATS,
    },
    'Ingestion cron jobs started',
  );

  return () => {
    for (const task of tasks) {
      task.stop();
    }
    logger.info('Ingestion cron jobs stopped');
  };
}
