import { logger } from '../lib/logger';
import { recordIngestionSync } from '../modules/ingestion/ingestion.status';
import { notifyIngestionFailure } from '../modules/admin/system/alert.service';
import {
  syncFixtures,
  syncGameweeks,
  syncPlayers,
  syncRealTeams,
} from '../modules/ingestion/ingestion.service';

export async function processBootstrapSync(): Promise<void> {
  try {
    logger.info('Running scheduled bootstrap + fixtures sync');
    await syncRealTeams();
    await syncPlayers();
    await syncGameweeks();
    await syncFixtures();
    await recordIngestionSync(true);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Scheduled bootstrap/fixtures sync failed';
    logger.error({ err }, 'Scheduled bootstrap/fixtures sync failed');
    await recordIngestionSync(false, message);
    void notifyIngestionFailure(message);
    throw err;
  }
}
