import { Router, Response, NextFunction } from 'express';
import { adminGuard } from '../../../middleware/adminGuard';
import {
  validateParams,
  validateQuery,
  validateRequest,
} from '../../../middleware/validateRequest';
import * as scoringService from './scoring.service';
import {
  commitCorrectionSchema,
  commitRecalculateSchema,
  correctionPreviewSchema,
  gameweekIdParamSchema,
  listRecalculationHistoryQuerySchema,
  recalculationIdParamSchema,
  type CommitCorrectionBody,
  type CommitRecalculateBody,
  type CorrectionPreviewBody,
  type GameweekIdParam,
  type ListRecalculationHistoryQuery,
  type RecalculationIdParam,
} from './scoring.validation';

const router = Router();

router.get('/stat-types', adminGuard, (_req, res) => {
  res.status(200).json({ data: scoringService.listStatTypes() });
});

router.get(
  '/recalculate/:gameweekId/preview',
  adminGuard,
  validateParams(gameweekIdParamSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { gameweekId } = res.locals.validatedParams as GameweekIdParam;
      const result = await scoringService.previewRecalculate(
        gameweekId,
        req.user!.userId,
      );

      if (!result) {
        res.status(404).json({ error: 'Gameweek not found' });
        return;
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/recalculate/:gameweekId',
  adminGuard,
  validateParams(gameweekIdParamSchema),
  validateRequest(commitRecalculateSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { gameweekId } = res.locals.validatedParams as GameweekIdParam;
      const body = req.body as CommitRecalculateBody;
      const result = await scoringService.commitRecalculate(
        gameweekId,
        req.user!.userId,
        body,
      );

      if (!result) {
        res.status(404).json({ error: 'Gameweek not found' });
        return;
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/correct/preview',
  adminGuard,
  validateRequest(correctionPreviewSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const body = req.body as CorrectionPreviewBody;
      const result = await scoringService.previewCorrection(req.user!.userId, body);

      if (!result) {
        res.status(404).json({ error: 'Gameweek not found' });
        return;
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/correct',
  adminGuard,
  validateRequest(commitCorrectionSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const body = req.body as CommitCorrectionBody;
      const result = await scoringService.commitCorrection(req.user!.userId, body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/recalculation-history',
  adminGuard,
  validateQuery(listRecalculationHistoryQuerySchema),
  async (_req, res, next) => {
    try {
      const query = res.locals.validatedQuery as ListRecalculationHistoryQuery;
      const result = await scoringService.listRecalculationHistory(query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/recalculation-history/:id',
  adminGuard,
  validateParams(recalculationIdParamSchema),
  async (_req, res, next) => {
    try {
      const { id } = res.locals.validatedParams as RecalculationIdParam;
      const result = await scoringService.getRecalculationHistoryEntry(id);

      if (!result) {
        res.status(404).json({ error: 'Recalculation event not found' });
        return;
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
