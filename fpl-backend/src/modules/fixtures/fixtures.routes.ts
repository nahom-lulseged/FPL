import { Router } from 'express';
import { validateQuery } from '../../middleware/validateRequest';
import * as fixturesController from './fixtures.controller';
import { listFixturesQuerySchema } from './fixtures.validation';

const router = Router();

router.get('/:id', fixturesController.getFixture);

router.get(
  '/',
  validateQuery(listFixturesQuerySchema),
  fixturesController.listFixtures,
);

export default router;
