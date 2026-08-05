import type { Request, Response, NextFunction } from 'express';
import { toMinor } from '../../lib/money';
import * as depositsService from './deposits.service';

export async function requestWithdraw(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as { amountMinor?: number; amountMajor?: number };
    const amountMinor =
      body.amountMinor ?? (body.amountMajor !== undefined ? toMinor(body.amountMajor) : 0);

    const withdrawal = await depositsService.requestWithdrawal(req.user!.userId, amountMinor);
    res.status(201).json({
      id: withdrawal.id,
      amountMinor: withdrawal.amountMinor,
      status: withdrawal.status,
    });
  } catch (err) {
    next(err);
  }
}
