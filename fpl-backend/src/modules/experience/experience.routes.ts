import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import * as experience from './experience.controller';

const router = Router();
router.get('/dashboard', authGuard, experience.getDashboard);
router.get('/leaderboard', authGuard, experience.getLeaderboard);
router.get('/profile', authGuard, experience.getProfile);
router.patch('/profile', authGuard, experience.updateProfile);
router.get('/profile/statistics', authGuard, experience.getProfileStatistics);
router.get('/profile/achievements', authGuard, experience.getProfileAchievements);
router.get('/notifications', authGuard, experience.getNotifications);
router.patch('/notifications/:id/read', authGuard, experience.markNotificationRead);
export default router;
