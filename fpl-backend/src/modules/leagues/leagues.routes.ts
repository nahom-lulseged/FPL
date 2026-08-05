import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import { financeRateLimiter } from '../../middleware/financeRateLimiter';
import { validateParams, validateQuery, validateRequest } from '../../middleware/validateRequest';
import * as leaguesController from './leagues.controller';
import {
  createLeagueSchema,
  joinLeagueSchema,
  leagueIdParamsSchema,
  listLeaguesQuerySchema,
  standingsQuerySchema,
} from './leagues.validation';

const router = Router();

router.use(authGuard);

router.get('/', validateQuery(listLeaguesQuerySchema), leaguesController.listMyLeagues);
router.post(
  '/',
  financeRateLimiter,
  validateRequest(createLeagueSchema),
  leaguesController.createLeague,
);
router.post(
  '/join',
  financeRateLimiter,
  validateRequest(joinLeagueSchema),
  leaguesController.joinLeague,
);
router.get(
  '/:id',
  validateParams(leagueIdParamsSchema),
  leaguesController.getLeague,
);
router.get(
  '/:id/standings',
  validateParams(leagueIdParamsSchema),
  validateQuery(standingsQuerySchema),
  leaguesController.getStandings,
);

export default router;
