import { randomUUID } from 'crypto';
import { redis } from '../../../config/redis';
import type { TeamScoreDiff } from '../../scoring/scoring.types';
import type { CorrectableStatType } from '../../scoring/playerPoints.calculator';

const PREVIEW_PREFIX = 'scoring:preview:';
const PREVIEW_TTL_SECONDS = 15 * 60;

export type PreviewType = 'FULL_RECALC' | 'CORRECTION';

export interface CorrectionPatch {
  playerId: string;
  gameweekId: string;
  statType: CorrectableStatType;
  newValue: number | boolean;
  beforeStats: Record<string, unknown>;
  afterStats: Record<string, unknown>;
  oldPlayerPoints: number;
  newPlayerPoints: number;
}

export interface PreviewPayload {
  type: PreviewType;
  adminId: string;
  gameweekId: string;
  gameweekNumber: number;
  diffs: TeamScoreDiff[];
  correction?: CorrectionPatch;
}

export async function storePreview(payload: PreviewPayload): Promise<string> {
  const token = randomUUID();
  await redis.set(
    `${PREVIEW_PREFIX}${token}`,
    JSON.stringify(payload),
    'EX',
    PREVIEW_TTL_SECONDS,
  );
  return token;
}

export async function consumePreview(
  token: string,
  adminId: string,
): Promise<PreviewPayload> {
  const key = `${PREVIEW_PREFIX}${token}`;
  const raw = await redis.get(key);

  if (!raw) {
    throw new PreviewTokenError('Preview token expired or invalid');
  }

  const payload = JSON.parse(raw) as PreviewPayload;

  if (payload.adminId !== adminId) {
    throw new PreviewTokenError('Preview token does not belong to this admin');
  }

  await redis.del(key);
  return payload;
}

export class PreviewTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreviewTokenError';
  }
}
