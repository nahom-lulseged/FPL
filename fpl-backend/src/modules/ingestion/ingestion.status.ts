import { redis } from '../../config/redis';
import { prisma } from '../../config/db';

const INGESTION_LAST_SYNC_KEY = 'ingestion:lastSync';

export interface IngestionSyncRecord {
  timestamp: string;
  success: boolean;
  error?: string;
}

export async function recordIngestionSync(success: boolean, error?: string): Promise<void> {
  const record: IngestionSyncRecord = {
    timestamp: new Date().toISOString(),
    success,
    ...(error ? { error } : {}),
  };
  await redis.set(INGESTION_LAST_SYNC_KEY, JSON.stringify(record)).catch(() => undefined);
}

export async function getLastIngestionSync(): Promise<IngestionSyncRecord | null> {
  const raw = await redis.get(INGESTION_LAST_SYNC_KEY);
  if (!raw) {
    return getLastPersistentIngestionSync();
  }

  try {
    return JSON.parse(raw) as IngestionSyncRecord;
  } catch {
    return getLastPersistentIngestionSync();
  }
}

async function getLastPersistentIngestionSync(): Promise<IngestionSyncRecord | null> {
  const log = await prisma.syncLog.findFirst({
    where: { finishedAt: { not: null } },
    orderBy: { finishedAt: 'desc' },
    select: {
      finishedAt: true,
      success: true,
      errorMessage: true,
    },
  });

  if (!log?.finishedAt) {
    return null;
  }

  return {
    timestamp: log.finishedAt.toISOString(),
    success: log.success,
    ...(log.errorMessage ? { error: log.errorMessage } : {}),
  };
}
