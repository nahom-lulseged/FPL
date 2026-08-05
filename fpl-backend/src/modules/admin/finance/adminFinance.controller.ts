import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { buildMeta } from '../../../lib/pagination';
import { AppError } from '../../../middleware/errorHandler';
import { logAdminAction } from '../audit/auditLog.service';
import { computePayoutPreview, commitPayoutDistribution } from '../../../modules/staked-leagues/payoutCalculator.service';
import { listStakedLeaguesAdmin } from '../../../modules/staked-leagues/stakedLeagues.service';
import {
  approveDeposit,
  approveWithdrawal,
  getCommissionTotal,
  listPaymentTransactions,
  listPendingDeposits,
  listPendingWithdrawals,
  rejectDeposit,
  rejectWithdrawal,
} from '../../../modules/payments/deposits.service';
import {
  listLedgerForWalletId,
  reconcileAllWallets,
  searchWalletByUserEmail,
} from '../../../modules/wallet/wallet.service';
import { prisma } from '../../../config/db';
import {
  consumePayoutPreview,
  PayoutPreviewTokenError,
  storePayoutPreview,
} from './payout.preview';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const transactionsQuerySchema = paginationSchema.extend({
  type: z.enum(['all', 'deposit', 'withdraw']).default('all'),
});

const walletSearchSchema = z.object({
  email: z.string().email(),
});

const rejectSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

const payoutCommitSchema = z.object({
  previewToken: z.string().uuid(),
  reason: z.string().trim().min(1).max(500),
});

const disputeFreezeSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export async function lookupWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = walletSearchSchema.parse(req.query);
    const result = await searchWalletByUserEmail(email);

    if (!result) {
      throw new AppError(404, 'User not found');
    }

    const ledger = await listLedgerForWalletId(result.wallet.id, { page: 1, limit: 50 });

    res.status(200).json({
      user: result.user,
      wallet: result.wallet,
      reconciliation: result.reconciliation,
      ledger: ledger.entries,
    });
  } catch (err) {
    next(err);
  }
}

export async function listDeposits(req: Request, res: Response, next: NextFunction) {
  try {
    const query = paginationSchema.parse(req.query);
    const { data, total } = await listPendingDeposits(query);
    res.status(200).json({
      data,
      meta: buildMeta(query.page, query.limit, total),
    });
  } catch (err) {
    next(err);
  }
}

export async function listTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const query = transactionsQuerySchema.parse(req.query);
    const { data, total } = await listPaymentTransactions(query);
    res.status(200).json({
      data,
      meta: buildMeta(query.page, query.limit, total),
    });
  } catch (err) {
    next(err);
  }
}

export async function approveDepositHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = String(req.params.id);
    const before = await prisma.deposit.findUnique({ where: { id } });
    await approveDeposit(id, req.user!.userId);
    const after = await prisma.deposit.findUnique({ where: { id } });

    await logAdminAction({
      adminId: req.user!.userId,
      action: 'DEPOSIT_APPROVE',
      targetType: 'Deposit',
      targetId: id,
      before,
      after,
    });

    res.status(200).json({ approved: true });
  } catch (err) {
    next(err);
  }
}

export async function rejectDepositHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = String(req.params.id);
    const body = rejectSchema.parse(req.body);
    const before = await prisma.deposit.findUnique({ where: { id } });
    await rejectDeposit(id, body.reason);
    const after = await prisma.deposit.findUnique({ where: { id } });

    await logAdminAction({
      adminId: req.user!.userId,
      action: 'DEPOSIT_REJECT',
      targetType: 'Deposit',
      targetId: id,
      before,
      after: { ...after, rejectionReason: body.reason },
    });

    res.status(200).json({ rejected: true });
  } catch (err) {
    next(err);
  }
}

export async function listWithdrawals(req: Request, res: Response, next: NextFunction) {
  try {
    const query = paginationSchema.parse(req.query);
    const { data, total } = await listPendingWithdrawals(query);
    res.status(200).json({
      data,
      meta: buildMeta(query.page, query.limit, total),
    });
  } catch (err) {
    next(err);
  }
}

export async function approveWithdrawalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = String(req.params.id);
    const before = await prisma.withdrawal.findUnique({ where: { id } });
    await approveWithdrawal(id, req.user!.userId);
    const after = await prisma.withdrawal.findUnique({ where: { id } });

    await logAdminAction({
      adminId: req.user!.userId,
      action: 'WITHDRAWAL_APPROVE',
      targetType: 'Withdrawal',
      targetId: id,
      before,
      after,
    });

    res.status(200).json({ approved: true });
  } catch (err) {
    next(err);
  }
}

export async function rejectWithdrawalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = String(req.params.id);
    const body = rejectSchema.parse(req.body);
    const before = await prisma.withdrawal.findUnique({ where: { id } });
    await rejectWithdrawal(id, body.reason);
    const after = await prisma.withdrawal.findUnique({ where: { id } });

    await logAdminAction({
      adminId: req.user!.userId,
      action: 'WITHDRAWAL_REJECT',
      targetType: 'Withdrawal',
      targetId: id,
      before,
      after: { ...after, rejectionReason: body.reason },
    });

    res.status(200).json({ rejected: true });
  } catch (err) {
    next(err);
  }
}

export async function previewPayout(req: Request, res: Response, next: NextFunction) {
  try {
    const leagueId = String(req.params.leagueId);
    const preview = await computePayoutPreview(leagueId);
    const previewToken = await storePayoutPreview({
      adminId: req.user!.userId,
      leagueId,
      preview,
    });

    res.status(200).json({ preview, previewToken });
  } catch (err) {
    next(err);
  }
}

export async function commitPayout(req: Request, res: Response, next: NextFunction) {
  try {
    const leagueId = String(req.params.leagueId);
    const body = payoutCommitSchema.parse(req.body);

    let payload;
    try {
      payload = await consumePayoutPreview(body.previewToken, req.user!.userId);
    } catch (err) {
      if (err instanceof PayoutPreviewTokenError) {
        throw new AppError(400, err.message);
      }
      throw err;
    }

    if (payload.leagueId !== leagueId) {
      throw new AppError(400, 'Preview token league mismatch');
    }

    const before = await prisma.league.findUnique({ where: { id: leagueId } });

    await commitPayoutDistribution(
      leagueId,
      payload.preview,
      `payout:${leagueId}:${body.previewToken}`,
    );

    const after = await prisma.league.findUnique({ where: { id: leagueId } });

    await logAdminAction({
      adminId: req.user!.userId,
      action: 'PAYOUT_COMMIT',
      targetType: 'League',
      targetId: leagueId,
      before,
      after: { ...after, reason: body.reason, preview: payload.preview },
    });

    res.status(200).json({ committed: true });
  } catch (err) {
    next(err);
  }
}

export async function listStakedLeagues(req: Request, res: Response, next: NextFunction) {
  try {
    const query = paginationSchema.extend({
      payoutStatus: z.string().optional(),
    }).parse(req.query);
    const result = await listStakedLeaguesAdmin(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function freezeLeaguePayout(req: Request, res: Response, next: NextFunction) {
  try {
    const leagueId = String(req.params.leagueId);
    const body = disputeFreezeSchema.parse(req.body);
    const before = await prisma.league.findUnique({ where: { id: leagueId } });

    const after = await prisma.league.update({
      where: { id: leagueId },
      data: { payoutStatus: 'LOCKED' },
    });

    await logAdminAction({
      adminId: req.user!.userId,
      action: 'DISPUTE_FREEZE',
      targetType: 'League',
      targetId: leagueId,
      before,
      after: { ...after, freezeReason: body.reason },
    });

    res.status(200).json({ frozen: true });
  } catch (err) {
    next(err);
  }
}

export async function getCommissionDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const totalMinor = await getCommissionTotal();
    const reconciliation = await reconcileAllWallets();
    res.status(200).json({
      commissionTotalMinor: totalMinor,
      reconciliation,
    });
  } catch (err) {
    next(err);
  }
}

export async function runReconciliation(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reconcileAllWallets();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
