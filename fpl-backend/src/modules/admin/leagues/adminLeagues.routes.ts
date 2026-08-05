import { Router, Response, NextFunction } from 'express';
import { adminGuard } from '../../../middleware/adminGuard';
import {
  validateParams,
  validateQuery,
  validateRequest,
} from '../../../middleware/validateRequest';
import * as adminLeaguesService from './adminLeagues.service';
import {
  confirmActionSchema,
  leagueIdParamSchema,
  leagueMemberParamsSchema,
  listLeaguesQuerySchema,
  type ConfirmActionBody,
  type LeagueIdParam,
  type LeagueMemberParams,
  type ListLeaguesQuery,
} from './adminLeagues.validation';

const router = Router();

router.get(
  '/',
  adminGuard,
  validateQuery(listLeaguesQuerySchema),
  async (_req, res, next) => {
    try {
      const result = await adminLeaguesService.listLeagues(
        res.locals.validatedQuery as ListLeaguesQuery,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id',
  adminGuard,
  validateParams(leagueIdParamSchema),
  async (_req, res, next) => {
    try {
      const { id } = res.locals.validatedParams as LeagueIdParam;
      const league = await adminLeaguesService.getLeagueDetail(id);

      if (!league) {
        res.status(404).json({ error: 'League not found' });
        return;
      }

      res.status(200).json(league);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id/members/:userId',
  adminGuard,
  validateParams(leagueMemberParamsSchema),
  validateRequest(confirmActionSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { id, userId } = res.locals.validatedParams as LeagueMemberParams;
      const body = req.body as ConfirmActionBody;
      const result = await adminLeaguesService.removeLeagueMember(
        id,
        userId,
        req.user!.userId,
        body,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  adminGuard,
  validateParams(leagueIdParamSchema),
  validateRequest(confirmActionSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { id } = res.locals.validatedParams as LeagueIdParam;
      const body = req.body as ConfirmActionBody;
      const result = await adminLeaguesService.dissolveLeague(
        id,
        req.user!.userId,
        body,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
