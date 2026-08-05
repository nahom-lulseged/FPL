import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from './errorHandler';

export async function kycGuard(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { kycVerifiedAt: true },
    });

    if (!user?.kycVerifiedAt) {
      throw new AppError(403, 'KYC verification required');
    }

    next();
  } catch (err) {
    next(err);
  }
}
