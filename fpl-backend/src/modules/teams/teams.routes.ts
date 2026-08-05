import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import { validateParams, validateQuery, validateRequest } from '../../middleware/validateRequest';
import transfersRoutes from '../transfers/transfers.routes';
import chipsRoutes from '../chips/chips.routes';
import * as teamsController from './teams.controller';
import {
  createTeamSchema,
  getTeamQuerySchema,
  setCaptainSchema,
  setLineupSchema,
  teamGameweekParamsSchema,
  teamHistoryQuerySchema,
  teamIdParamsSchema,
} from './teams.validation';

const router = Router();

router.use(authGuard);

router.post('/', validateRequest(createTeamSchema), teamsController.createTeam);

router.get(
  '/:id/gameweeks/:gw',
  validateParams(teamGameweekParamsSchema),
  teamsController.getTeamGameweek,
);

router.get(
  '/:id/history',
  validateParams(teamIdParamsSchema),
  validateQuery(teamHistoryQuerySchema),
  teamsController.getTeamHistory,
);

router.get(
  '/:id',
  validateQuery(getTeamQuerySchema),
  teamsController.getTeam,
);

router.patch(
  '/:id/captain',
  validateRequest(setCaptainSchema),
  teamsController.setCaptain,
);

router.patch(
  '/:id/lineup',
  validateRequest(setLineupSchema),
  teamsController.setLineup,
);

router.use('/:id/transfers', transfersRoutes);
router.use('/:id/chips', chipsRoutes);

export default router;
