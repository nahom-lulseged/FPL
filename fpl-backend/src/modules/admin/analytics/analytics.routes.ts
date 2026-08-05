import { Router } from 'express';
import { adminGuard } from '../../../middleware/adminGuard';
import { validateParams, validateQuery } from '../../../middleware/validateRequest';
import { streamEntityExport } from './analytics.export';
import {
  getChipUsage,
  getGrowthMetrics,
  getTransferTrends,
} from './analytics.service';
import {
  exportEntityParamSchema,
  growthQuerySchema,
  transfersQuerySchema,
  type ExportEntityParam,
  type GrowthQuery,
  type TransfersQuery,
} from './analytics.validation';

const router = Router();

router.get(
  '/transfers',
  adminGuard,
  validateQuery(transfersQuerySchema),
  async (_req, res, next) => {
    try {
      const result = await getTransferTrends(
        res.locals.validatedQuery as TransfersQuery,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/chips', adminGuard, async (_req, res, next) => {
  try {
    const result = await getChipUsage();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/growth',
  adminGuard,
  validateQuery(growthQuerySchema),
  async (_req, res, next) => {
    try {
      const result = await getGrowthMetrics(
        res.locals.validatedQuery as GrowthQuery,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/export/:entity',
  adminGuard,
  validateParams(exportEntityParamSchema),
  async (_req, res, next) => {
    try {
      const { entity } = res.locals.validatedParams as ExportEntityParam;
      await streamEntityExport(entity, res);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
