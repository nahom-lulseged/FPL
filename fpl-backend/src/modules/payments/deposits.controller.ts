import type { Request, Response, NextFunction } from 'express';
import { toMinor } from '../../lib/money';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { AppError } from '../../middleware/errorHandler';
import * as depositsService from './deposits.service';

function walletDepositRedirect(
  res: Response,
  status: 'success' | 'failed' | 'pending',
  reason?: string,
): void {
  const params = new URLSearchParams({ deposit: status });
  if (reason) {
    params.set('reason', reason);
  }
  res.redirect(302, `${env.FRONTEND_URL}/wallet?${params.toString()}`);
}

export async function createDeposit(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as { amountMinor?: number; amountMajor?: number };
    const amountMinor =
      body.amountMinor ?? (body.amountMajor !== undefined ? toMinor(body.amountMajor) : 0);

    const result = await depositsService.initiateDeposit(req.user!.userId, amountMinor);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function mockCompleteDeposit(req: Request, res: Response, _next: NextFunction) {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const depositId = req.query.depositId as string;
    const ref = req.query.ref as string;

    if (!depositId || !ref) {
      walletDepositRedirect(res, 'failed', 'missing_params');
      return;
    }

    const { prisma } = await import('../../config/db');
    const full = await prisma.deposit.findUnique({ where: { id: depositId } });

    if (!full) {
      walletDepositRedirect(res, 'failed', 'deposit_not_found');
      return;
    }

    // Admin must approve to credit — mock only confirms the payment intent.
    if (full.paymentProviderRef && full.paymentProviderRef !== ref) {
      walletDepositRedirect(res, 'failed', 'ref_mismatch');
      return;
    }

    walletDepositRedirect(res, 'pending');
  } catch (err) {
    if (err instanceof AppError) {
      walletDepositRedirect(res, 'failed', err.message);
      return;
    }
    logger.error({ err }, 'mockCompleteDeposit failed');
    walletDepositRedirect(res, 'failed', 'server_error');
  }
}
