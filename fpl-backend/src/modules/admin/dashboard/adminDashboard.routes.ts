import { Router } from 'express';
import { adminGuard } from '../../../middleware/adminGuard';
import { getDashboardSummary } from './adminDashboard.service';
import { getDashboardOverview } from './dashboardOverview.service';

const router = Router();

router.get('/summary', adminGuard, async (_req, res, next) => {
  try {
    const summary = await getDashboardSummary();
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
});

router.get('/overview', adminGuard, async (_req, res, next) => {
  try {
    res.status(200).json(await getDashboardOverview());
  } catch (err) {
    next(err);
  }
});

export default router;
