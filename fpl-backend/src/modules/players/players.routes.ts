import { Router } from 'express';
import { validateParams, validateQuery } from '../../middleware/validateRequest';
import * as playersController from './players.controller';
import { listPlayersQuerySchema, playerIdParamSchema } from './players.validation';

const router = Router();

router.get(
  '/',
  validateQuery(listPlayersQuerySchema),
  playersController.listPlayers,
);

router.get(
  '/:id',
  validateParams(playerIdParamSchema),
  playersController.getPlayerById,
);

export default router;
