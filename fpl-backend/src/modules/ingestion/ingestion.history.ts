import { prisma } from '../../config/db';
import type { SyncHistoryQuery } from './ingestion.validation';

export async function listSyncHistory(query: SyncHistoryQuery) {
  const where = {
    ...(query.syncType ? { syncType: query.syncType } : {}),
    ...(query.success !== undefined ? { success: query.success } : {}),
  };

  const skip = (query.page - 1) * query.limit;

  const [rows, total] = await Promise.all([
    prisma.syncLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip,
      take: query.limit,
    }),
    prisma.syncLog.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    syncType: row.syncType,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    success: row.success,
    rowsChanged: row.rowsChanged,
    errorMessage: row.errorMessage,
    durationMs:
      row.finishedAt !== null
        ? row.finishedAt.getTime() - row.startedAt.getTime()
        : null,
  }));

  const totalPages = Math.ceil(total / query.limit) || 1;

  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}
