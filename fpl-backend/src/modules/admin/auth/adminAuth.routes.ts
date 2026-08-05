import { Router, Response, NextFunction } from 'express';
import { adminLoginRateLimiter } from '../../../middleware/adminLoginRateLimiter';
import { validateRequest } from '../../../middleware/validateRequest';
import * as adminAuthService from './adminAuth.service';
import {
  adminLoginSchema,
  type AdminLoginInput,
} from './adminAuth.validation';

const router = Router();

router.post(
  '/login',
  adminLoginRateLimiter,
  validateRequest(adminLoginSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const result = await adminAuthService.adminLogin(req.body as AdminLoginInput);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
