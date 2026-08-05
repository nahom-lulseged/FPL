import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from './errorHandler';

export async function stakeGuard(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { termsAcceptedAt: true, ageVerifiedAt: true },
    });

    if (!user?.termsAcceptedAt) {
      throw new AppError(403, 'Terms of service must be accepted before staking');
    }

    if (!user?.ageVerifiedAt) {
      throw new AppError(403, 'Age verification required before staking');
    }

    next();
  } catch (err) {
    next(err);
  }
}
