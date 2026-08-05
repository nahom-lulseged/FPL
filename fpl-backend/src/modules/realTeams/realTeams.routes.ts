import { Router } from 'express';
import * as realTeamsController from './realTeams.controller';

const router = Router();

router.get('/', realTeamsController.listRealTeams);

export default router;
