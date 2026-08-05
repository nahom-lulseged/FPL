import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/errorHandler';
import * as depositsService from './deposits.service';
import { getPaymentProvider } from './providers';

export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const providerName = req.params.provider;
    const provider = getPaymentProvider();

    if (provider.name !== providerName) {
      throw new AppError(400, 'Provider mismatch');
    }

    const rawBody = JSON.stringify(req.body);
    const bodySignature = typeof req.body?.sign === 'string' ? req.body.sign : '';
    const signature = (req.headers['x-webhook-signature'] as string) ?? bodySignature;

    const parsed = provider.parseWebhook(rawBody);
    const verified = provider.verifyWebhook({
      ...parsed,
      rawBody,
      signature,
    });

    if (!verified) {
      throw new AppError(401, 'Invalid webhook signature');
    }

    const idempotencyKey = `${providerName}:${parsed.providerRef}`;

    if (parsed.status === 'COMPLETED') {
      await depositsService.completeDepositFromWebhook(
        parsed.providerRef,
        parsed.amountMinor,
        idempotencyKey,
      );
    } else {
      await depositsService.failDeposit(parsed.providerRef);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}
