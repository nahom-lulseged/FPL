import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import { authRateLimiter, sensitiveAuthRateLimiter } from '../../middleware/rateLimiter';
import { validateRequest } from '../../middleware/validateRequest';
import * as authController from './auth.controller';
import * as telegramAuthController from './telegramAuth.controller';
import { refreshTokenSchema } from './auth.validation';

const router = Router();

router.post('/telegram/start', authRateLimiter, telegramAuthController.start);

router.post(
  '/refresh',
  sensitiveAuthRateLimiter,
  validateRequest(refreshTokenSchema),
  authController.refresh,
);

router.post('/logout', sensitiveAuthRateLimiter, authGuard, authController.logout);

export default router;
