import { Router, Response, NextFunction } from 'express';
import { adminGuard } from '../../middleware/adminGuard';
import { validateParams, validateQuery } from '../../middleware/validateRequest';
import { env } from '../../config/env';
import { listSyncHistory } from './ingestion.history';
import * as ingestionService from './ingestion.service';
import { getLastIngestionSync } from './ingestion.status';
import { notifyIngestionFailure } from '../admin/system/alert.service';
import {
  syncHistoryQuerySchema,
  syncTypeParamSchema,
  type SyncHistoryQuery,
  type SyncTypeParam,
} from './ingestion.validation';

const router = Router();

let syncInProgress = false;

export function __setSyncInProgressForTests(value: boolean): void {
  syncInProgress = value;
}

export function __getSyncInProgressForTests(): boolean {
  return syncInProgress;
}

async function runSync(
  fn: () => Promise<unknown>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (syncInProgress) {
    res.status(409).json({ error: 'Sync already in progress' });
    return;
  }

  syncInProgress = true;
  try {
    const result = await fn();
    res.status(200).json({
      success: true,
      syncedAt: new Date().toISOString(),
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingestion sync failed';
    void notifyIngestionFailure(message);
    res.status(500).json({ error: message });
  } finally {
    syncInProgress = false;
  }
}

router.get('/status', adminGuard, async (_req, res, next) => {
  try {
    const lastSync = await getLastIngestionSync();
    res.status(200).json({
      lastSyncAt: lastSync?.timestamp ?? null,
      success: lastSync?.success ?? null,
      error: lastSync?.error ?? null,
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/history',
  adminGuard,
  validateQuery(syncHistoryQuerySchema),
  async (_req, res, next) => {
    try {
      const result = await listSyncHistory(
        res.locals.validatedQuery as SyncHistoryQuery,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post('/sync', adminGuard, async (_req, res, next) => {
  await runSync(() => ingestionService.syncAll(), res, next);
});

router.post('/element-summary/backfill', adminGuard, async (req, res, next) => {
  try {
    const limit =
      typeof req.body?.limit === 'number' && req.body.limit > 0
        ? Math.floor(req.body.limit)
        : undefined;
    const delayMs =
      typeof req.body?.delayMs === 'number' && req.body.delayMs >= 0
        ? Math.floor(req.body.delayMs)
        : undefined;

    if (env.ENABLE_BULLMQ) {
      const { enqueueElementSummaryBackfill } = await import('../../jobs/queue');
      const { jobId } = await enqueueElementSummaryBackfill({ limit, delayMs });
      res.status(202).json({
        success: true,
        queued: true,
        jobId,
      });
      return;
    }

    await runSync(
      () => ingestionService.backfillElementSummaries({ limit, delayMs }),
      res,
      next,
    );
  } catch (err) {
    next(err);
  }
});

router.post(
  '/sync/:type',
  adminGuard,
  validateParams(syncTypeParamSchema),
  async (req, res, next) => {
    const { type } = res.locals.validatedParams as SyncTypeParam;

    const syncFns: Record<SyncTypeParam['type'], () => Promise<unknown>> = {
      teams: () => ingestionService.syncRealTeams(),
      players: () => ingestionService.syncPlayers(),
      fixtures: () => ingestionService.syncFixtures(),
      gameweeks: () => ingestionService.syncGameweeks(),
      all: () => ingestionService.syncAll(),
    };

    await runSync(syncFns[type], res, next);
  },
);

export default router;
