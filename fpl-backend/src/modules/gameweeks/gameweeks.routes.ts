import { Router } from 'express';
import * as gameweeksController from './gameweeks.controller';

const router = Router();

router.get('/transfer-window', gameweeksController.getTransferWindow);
router.get('/current', gameweeksController.getCurrentGameweek);
router.get('/', gameweeksController.listGameweeks);

export default router;
