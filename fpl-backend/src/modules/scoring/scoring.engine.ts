import { calculateBenchBoostPoints } from '../chips/chips.rules';
import {
  applyCaptainMultiplier,
  captainBonusFromBase,
  resolveCaptain,
} from './scoring.rules';
import { applyAutoSubstitutions } from './autoSubstitution';
import type {
  ChipScoringOptions,
  PlayerGwInput,
  PlayerScoreBreakdown,
  SnapshotSlot,
  TeamGameweekResult,
} from './scoring.types';

function defaultStats(slot: SnapshotSlot): PlayerGwInput {
  return {
    playerId: slot.playerId,
    position: slot.position,
    minutes: 0,
    points: 0,
  };
}

export function scoreTeamGameweek(
  snapshot: SnapshotSlot[],
  statsByPlayerId: Map<string, PlayerGwInput>,
  transferHit = 0,
  chipOptions: ChipScoringOptions = {},
): TeamGameweekResult {
  const fullStats = new Map<string, PlayerGwInput>();
  for (const slot of snapshot) {
    fullStats.set(
      slot.playerId,
      statsByPlayerId.get(slot.playerId) ?? defaultStats(slot),
    );
  }

  const { effectivePlayerIds, substitutedIn, substitutedOut } =
    applyAutoSubstitutions(snapshot, fullStats);

  const effectiveSet = new Set(effectivePlayerIds);
  const minutesByPlayerId = new Map(
    [...fullStats.entries()].map(([id, s]) => [id, s.minutes]),
  );
  const { multiplierByPlayerId } = resolveCaptain(
    snapshot,
    minutesByPlayerId,
    chipOptions,
  );

  let startersPoints = 0;
  let captainBonus = 0;
  const players: PlayerScoreBreakdown[] = [];

  for (const slot of snapshot) {
    const stats = fullStats.get(slot.playerId)!;
    const counted = effectiveSet.has(slot.playerId);
    const multiplier = counted
      ? (multiplierByPlayerId.get(slot.playerId) ?? 1)
      : 1;
    const basePoints = counted ? stats.points : 0;
    const effectivePoints = counted
      ? applyCaptainMultiplier(stats.points, multiplier)
      : 0;

    if (counted) {
      startersPoints += stats.points;
      captainBonus += captainBonusFromBase(stats.points, multiplier);
    }

    players.push({
      playerId: slot.playerId,
      rawPoints: stats.points,
      counted,
      wasSubstitutedIn: substitutedIn.has(slot.playerId),
      wasSubstitutedOut: substitutedOut.has(slot.playerId),
      captainMultiplier: counted ? multiplier : 1,
      effectivePoints,
    });
  }

  const benchPoints = chipOptions.benchBoost
    ? calculateBenchBoostPoints(snapshot, effectiveSet, substitutedIn, fullStats)
    : 0;
  const totalPoints = startersPoints + captainBonus + benchPoints - transferHit;

  return {
    startersPoints,
    captainBonus,
    benchPoints,
    transferHit,
    totalPoints,
    players,
  };
}
