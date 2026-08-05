import { Router } from 'express';
import { adminGuard } from '../../../middleware/adminGuard';
import * as adminFinanceController from './adminFinance.controller';

const router = Router();

router.use(adminGuard);

router.get('/wallets/lookup', adminFinanceController.lookupWallet);
router.get('/transactions', adminFinanceController.listTransactions);
router.get('/deposits', adminFinanceController.listDeposits);
router.post('/deposits/:id/approve', adminFinanceController.approveDepositHandler);
router.post('/deposits/:id/reject', adminFinanceController.rejectDepositHandler);
router.get('/withdrawals', adminFinanceController.listWithdrawals);
router.post('/withdrawals/:id/approve', adminFinanceController.approveWithdrawalHandler);
router.post('/withdrawals/:id/reject', adminFinanceController.rejectWithdrawalHandler);
router.get('/payouts/leagues', adminFinanceController.listStakedLeagues);
router.get('/payouts/:leagueId/preview', adminFinanceController.previewPayout);
router.post('/payouts/:leagueId/commit', adminFinanceController.commitPayout);
router.post('/disputes/:leagueId/freeze', adminFinanceController.freezeLeaguePayout);
router.get('/commission', adminFinanceController.getCommissionDashboard);
router.post('/reconciliation/run', adminFinanceController.runReconciliation);

export default router;
