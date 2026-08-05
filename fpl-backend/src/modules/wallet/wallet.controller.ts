import type { Request, Response, NextFunction } from 'express';
import { buildMeta } from '../../lib/pagination';
import { formatMinor } from '../../lib/money';
import * as walletService from './wallet.service';

export async function getMyWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const wallet = await walletService.getWalletForUser(req.user!.userId);
    res.status(200).json({
      id: wallet.id,
      balanceMinor: wallet.balanceMinor,
      currency: wallet.currency,
      balanceDisplay: formatMinor(wallet.balanceMinor, wallet.currency),
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyLedger(req: Request, res: Response, next: NextFunction) {
  try {
    const query = res.locals.validatedQuery as { page: number; limit: number };
    const { wallet, entries, total } = await walletService.listLedgerForUser(
      req.user!.userId,
      query,
    );

    res.status(200).json({
      data: entries.map((e) => ({
        id: e.id,
        amountMinor: e.amountMinor,
        direction: e.direction,
        entryType: e.entryType,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
        description: e.description,
        createdAt: e.createdAt.toISOString(),
      })),
      meta: buildMeta(query.page, query.limit, total),
      balanceMinor: wallet.balanceMinor,
    });
  } catch (err) {
    next(err);
  }
}
