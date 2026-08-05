import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import { financeRateLimiter } from '../../middleware/financeRateLimiter';
import { kycGuard } from '../../middleware/kycGuard';
import { validateRequest } from '../../middleware/validateRequest';
import * as depositsController from './deposits.controller';
import * as withdrawalsController from './withdrawals.controller';
import * as webhooksController from './webhooks.controller';
import { depositSchema, withdrawSchema } from './payments.validation';

const router = Router();

router.post(
  '/deposit',
  authGuard,
  financeRateLimiter,
  validateRequest(depositSchema),
  depositsController.createDeposit,
);

router.post(
  '/withdraw',
  authGuard,
  financeRateLimiter,
  kycGuard,
  validateRequest(withdrawSchema),
  withdrawalsController.requestWithdraw,
);

router.post('/webhook/:provider', financeRateLimiter, webhooksController.handleWebhook);

// Dev-only mock deposit completion redirect target
if (process.env.NODE_ENV !== 'production') {
  router.get('/mock/complete', depositsController.mockCompleteDeposit);
}

export default router;
