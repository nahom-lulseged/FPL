import { Router } from 'express';
import { adminGuard } from '../../middleware/adminGuard';
import dashboardRoutes from './dashboard/adminDashboard.routes';
import contentRoutes from './content/content.routes';
import usersRoutes from './users/adminUsers.routes';
import scoringRoutes from './scoring/scoring.routes';
import leaguesRoutes from './leagues/adminLeagues.routes';
import systemRoutes from './system/system.routes';
import analyticsRoutes from './analytics/analytics.routes';
import auditRoutes from './audit/audit.routes';
import financeRoutes from './finance/adminFinance.routes';
import adminAuthRoutes from './auth/adminAuth.routes';
import ingestionRoutes from '../ingestion/ingestion.routes';
import telegramContactClaimsRoutes from './support/telegramContactClaims.routes';

const router = Router();

router.use('/auth', adminAuthRoutes);

router.get('/health', adminGuard, (_req, res) => {
  res.status(200).json({ status: 'ok', role: 'admin' });
});

router.use('/dashboard', dashboardRoutes);
router.use('/ingestion', ingestionRoutes);
router.use('/content', contentRoutes);
router.use('/users', usersRoutes);
router.use('/scoring', scoringRoutes);
router.use('/leagues', leaguesRoutes);
router.use('/system', systemRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit', auditRoutes);
router.use('/finance', financeRoutes);
router.use('/support', telegramContactClaimsRoutes);

export default router;
