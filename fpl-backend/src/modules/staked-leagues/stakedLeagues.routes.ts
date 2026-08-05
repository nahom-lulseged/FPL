import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import { financeRateLimiter } from '../../middleware/financeRateLimiter';
import { validateParams, validateQuery } from '../../middleware/validateRequest';
import * as stakedLeaguesController from './stakedLeagues.controller';
import { listStakedLeaguesQuerySchema } from './stakedLeagues.validation';
import { z } from 'zod';

const leagueIdParamsSchema = z.object({ id: z.string().min(1) });

const router = Router();

router.use(authGuard);

router.get(
  '/',
  validateQuery(listStakedLeaguesQuerySchema),
  stakedLeaguesController.listPublicStakedLeagues,
);

router.post(
  '/:id/join',
  financeRateLimiter,
  validateParams(leagueIdParamsSchema),
  stakedLeaguesController.joinPublicStakedLeague,
);

export default router;
