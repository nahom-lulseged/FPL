import { TRIPLE_CAPTAIN_MULTIPLIER } from '../../lib/constants';
import type { SnapshotSlot } from './scoring.types';
import type { CaptainMultiplier, CaptainResolution, ChipScoringOptions } from './scoring.types';

export const CAPTAIN_MULTIPLIER = 2 as const;

export function didPlay(minutes: number): boolean {
  return minutes > 0;
}

export function applyCaptainMultiplier(
  basePoints: number,
  multiplier: CaptainMultiplier,
): number {
  return basePoints * multiplier;
}

export function captainBonusFromBase(
  basePoints: number,
  multiplier: CaptainMultiplier,
): number {
  return basePoints * (multiplier - 1);
}

export function resolveCaptain(
  snapshot: SnapshotSlot[],
  minutesByPlayerId: Map<string, number>,
  chipOptions: ChipScoringOptions = {},
): CaptainResolution {
  const captain = snapshot.find((s) => s.isCaptain);
  const vice = snapshot.find((s) => s.isViceCaptain);
  const multiplierByPlayerId = new Map<string, CaptainMultiplier>();
  const activeMultiplier: CaptainMultiplier = chipOptions.tripleCaptain
    ? TRIPLE_CAPTAIN_MULTIPLIER
    : CAPTAIN_MULTIPLIER;

  for (const slot of snapshot) {
    multiplierByPlayerId.set(slot.playerId, 1);
  }

  if (!captain || !vice) {
    return { effectiveCaptainId: null, multiplierByPlayerId };
  }

  const captainPlayed = didPlay(minutesByPlayerId.get(captain.playerId) ?? 0);
  const vicePlayed = didPlay(minutesByPlayerId.get(vice.playerId) ?? 0);

  let effectiveCaptainId: string | null = null;

  if (captainPlayed) {
    effectiveCaptainId = captain.playerId;
    multiplierByPlayerId.set(captain.playerId, activeMultiplier);
  } else if (vicePlayed) {
    effectiveCaptainId = vice.playerId;
    multiplierByPlayerId.set(vice.playerId, activeMultiplier);
  }

  return { effectiveCaptainId, multiplierByPlayerId };
}
