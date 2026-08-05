import { randomUUID } from 'crypto';
import { redis } from '../../../config/redis';
import type { PayoutPreview } from '../../../modules/staked-leagues/payoutCalculator.service';

const PREVIEW_PREFIX = 'finance:payout:preview:';
const PREVIEW_TTL_SECONDS = 15 * 60;

export interface PayoutPreviewPayload {
  adminId: string;
  leagueId: string;
  preview: PayoutPreview;
}

export async function storePayoutPreview(payload: PayoutPreviewPayload): Promise<string> {
  const token = randomUUID();
  await redis.set(
    `${PREVIEW_PREFIX}${token}`,
    JSON.stringify(payload),
    'EX',
    PREVIEW_TTL_SECONDS,
  );
  return token;
}

export async function consumePayoutPreview(
  token: string,
  adminId: string,
): Promise<PayoutPreviewPayload> {
  const key = `${PREVIEW_PREFIX}${token}`;
  const raw = await redis.get(key);

  if (!raw) {
    throw new PayoutPreviewTokenError('Preview token expired or invalid');
  }

  const payload = JSON.parse(raw) as PayoutPreviewPayload;

  if (payload.adminId !== adminId) {
    throw new PayoutPreviewTokenError('Preview token does not belong to this admin');
  }

  await redis.del(key);
  return payload;
}

export class PayoutPreviewTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayoutPreviewTokenError';
  }
}
