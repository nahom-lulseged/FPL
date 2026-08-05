import { Router } from 'express';
import { z } from 'zod';
import { adminGuard } from '../../../middleware/adminGuard';
import { validateParams, validateRequest } from '../../../middleware/validateRequest';
import * as telegramAuthService from '../../auth/telegramAuth.service';

const router = Router();

const claimIdParamsSchema = z.object({ id: z.string().min(1) });
const resolveClaimSchema = z.object({ userId: z.string().min(1) });

router.get('/telegram-contact-claims', adminGuard, async (_req, res, next) => {
  try {
    res.status(200).json(await telegramAuthService.listTelegramContactClaims());
  } catch (err) {
    next(err);
  }
});

router.post(
  '/telegram-contact-claims/:id/resolve',
  adminGuard,
  validateParams(claimIdParamsSchema),
  validateRequest(resolveClaimSchema),
  async (req, res, next) => {
    try {
      const params = res.locals.validatedParams as z.infer<typeof claimIdParamsSchema>;
      const body = req.body as z.infer<typeof resolveClaimSchema>;
      res.status(200).json(await telegramAuthService.resolveTelegramContactClaim(params.id, body.userId, req.user!.userId));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
