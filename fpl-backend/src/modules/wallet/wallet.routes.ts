import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import { validateQuery } from '../../middleware/validateRequest';
import * as walletController from './wallet.controller';
import { ledgerQuerySchema } from './wallet.validation';

const router = Router();

router.use(authGuard);

router.get('/', walletController.getMyWallet);
router.get('/ledger', validateQuery(ledgerQuerySchema), walletController.getMyLedger);

export default router;
