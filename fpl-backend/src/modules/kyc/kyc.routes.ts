import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import * as kycController from './kyc.controller';

const router = Router();

router.use(authGuard);

router.get('/status', kycController.getComplianceStatus);
router.post('/terms/accept', kycController.acceptTerms);
router.post('/age/verify', kycController.verifyAge);
router.post('/submit', kycController.submitKyc);

export default router;
