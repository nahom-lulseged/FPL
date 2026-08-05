import { logger } from '../lib/logger';
import { backfillElementSummaries } from '../modules/ingestion/ingestion.service';

export async function processElementSummaryBackfill(data?: {
  limit?: number;
  delayMs?: number;
}): Promise<void> {
  logger.info({ limit: data?.limit }, 'Element summary backfill job started');
  const result = await backfillElementSummaries({
    limit: data?.limit,
    delayMs: data?.delayMs,
  });
  logger.info(result, 'Element summary backfill job completed');
}
