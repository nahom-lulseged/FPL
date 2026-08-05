import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { platformConfig } from '../../config/platformConfig';
import { AppError } from '../../middleware/errorHandler';

const kycSubmitSchema = z.object({
  documentRef: z.string().trim().min(1).max(500),
});

export async function acceptTerms(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { termsAcceptedAt: new Date() },
    });

    res.status(200).json({
      accepted: true,
      termsVersion: platformConfig.termsVersion,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyAge(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as { confirmed?: boolean };
    if (!body.confirmed) {
      throw new AppError(400, 'Age confirmation required');
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { ageVerifiedAt: new Date() },
    });

    res.status(200).json({ verified: true });
  } catch (err) {
    next(err);
  }
}

export async function submitKyc(req: Request, res: Response, next: NextFunction) {
  try {
    const body = kycSubmitSchema.parse(req.body);

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        kycDocumentRef: body.documentRef,
        // Admin approves KYC separately; auto-verify in dev for testing
        ...(process.env.NODE_ENV !== 'production' ? { kycVerifiedAt: new Date() } : {}),
      },
    });

    res.status(200).json({
      submitted: true,
      kycVerified: process.env.NODE_ENV !== 'production',
    });
  } catch (err) {
    next(err);
  }
}

export async function getComplianceStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        termsAcceptedAt: true,
        ageVerifiedAt: true,
        kycVerifiedAt: true,
        kycDocumentRef: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.status(200).json({
      termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
      ageVerifiedAt: user.ageVerifiedAt?.toISOString() ?? null,
      kycVerifiedAt: user.kycVerifiedAt?.toISOString() ?? null,
      kycDocumentRef: user.kycDocumentRef,
      termsVersion: platformConfig.termsVersion,
      canStake: Boolean(user.termsAcceptedAt && user.ageVerifiedAt),
      canWithdraw: Boolean(user.kycVerifiedAt),
    });
  } catch (err) {
    next(err);
  }
}
