import { Router } from 'express';
import { validateParams, validateQuery } from '../../middleware/validateRequest';
import * as controller from './fplCatalog.controller';
import {
  fplFixturesQuerySchema,
  fplPlayerParamsSchema,
  fplPlayersQuerySchema,
} from './fplCatalog.validation';

const router = Router();

router.get('/overview', controller.overview);
router.get('/teams', controller.teams);
router.get('/gameweeks', controller.gameweeks);
router.get('/players', validateQuery(fplPlayersQuerySchema), controller.players);
router.get('/players/:id', validateParams(fplPlayerParamsSchema), controller.playerSummary);
router.get('/fixtures', validateQuery(fplFixturesQuerySchema), controller.fixtures);
router.get('/bootstrap', controller.bootstrap);

export default router;

