import type { SyncType } from '@prisma/client';
import { prisma } from '../../config/db';
import type { SyncResult } from './fpl.types';
import { recordIngestionSync } from './ingestion.status';

export async function startSyncLog(syncType: SyncType): Promise<string> {
  const log = await prisma.syncLog.create({
    data: { syncType },
  });
  return log.id;
}

export async function finishSyncLog(
  logId: string,
  result: { success: boolean; rowsChanged: number; errorMessage?: string },
): Promise<void> {
  await prisma.syncLog.update({
    where: { id: logId },
    data: {
      finishedAt: new Date(),
      success: result.success,
      rowsChanged: result.rowsChanged,
      errorMessage: result.errorMessage ?? null,
    },
  });
  await recordIngestionSync(result.success, result.errorMessage);
}

export async function withSyncLog(
  syncType: SyncType,
  fn: () => Promise<SyncResult>,
): Promise<SyncResult> {
  const logId = await startSyncLog(syncType);
  try {
    const result = await fn();
    const rowsChanged = result.created + result.updated;
    await finishSyncLog(logId, { success: true, rowsChanged });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    await finishSyncLog(logId, { success: false, rowsChanged: 0, errorMessage: message });
    throw err;
  }
}
