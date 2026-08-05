import type { Position } from '@prisma/client';
import { isValidStarterFormation } from '../teams/squadValidator';
import type { EffectiveLineup, PlayerGwInput, SnapshotSlot } from './scoring.types';
import { didPlay } from './scoring.rules';

function buildPositions(snapshot: SnapshotSlot[]): Map<string, Position> {
  return new Map(snapshot.map((s) => [s.playerId, s.position]));
}

function trySubstitute(
  currentStarters: string[],
  nonPlayingStarterId: string,
  benchPlayerId: string,
  positions: Map<string, Position>,
): string[] | null {
  const next = currentStarters.map((id) =>
    id === nonPlayingStarterId ? benchPlayerId : id,
  );
  return isValidStarterFormation(next, positions) ? next : null;
}

export function applyAutoSubstitutions(
  snapshot: SnapshotSlot[],
  statsByPlayerId: Map<string, PlayerGwInput>,
): EffectiveLineup {
  const positions = buildPositions(snapshot);
  const starters = snapshot.filter((s) => s.isStarter);
  const bench = snapshot
    .filter((s) => !s.isStarter)
    .sort((a, b) => (a.benchOrder ?? 0) - (b.benchOrder ?? 0));

  const minutes = (playerId: string) => statsByPlayerId.get(playerId)?.minutes ?? 0;

  let effectiveStarters = starters.map((s) => s.playerId);
  const substitutedIn = new Set<string>();
  const substitutedOut = new Set<string>();
  const usedBench = new Set<string>();

  const nonPlayingStarterIds = () =>
    effectiveStarters.filter((id) => !didPlay(minutes(id)));

  for (const benchSlot of bench) {
    if (usedBench.has(benchSlot.playerId)) {
      continue;
    }

    if (!didPlay(minutes(benchSlot.playerId))) {
      continue;
    }

    const dnpStarters = nonPlayingStarterIds();
    if (dnpStarters.length === 0) {
      break;
    }

    let replaced = false;

    if (benchSlot.position === 'GK') {
      const dnpGk = dnpStarters.find((id) => positions.get(id) === 'GK');
      if (dnpGk) {
        const next = trySubstitute(
          effectiveStarters,
          dnpGk,
          benchSlot.playerId,
          positions,
        );
        if (next) {
          effectiveStarters = next;
          substitutedIn.add(benchSlot.playerId);
          substitutedOut.add(dnpGk);
          usedBench.add(benchSlot.playerId);
          replaced = true;
        }
      }
    } else {
      for (const dnpId of dnpStarters) {
        if (positions.get(dnpId) === 'GK') {
          continue;
        }
        const next = trySubstitute(
          effectiveStarters,
          dnpId,
          benchSlot.playerId,
          positions,
        );
        if (next) {
          effectiveStarters = next;
          substitutedIn.add(benchSlot.playerId);
          substitutedOut.add(dnpId);
          usedBench.add(benchSlot.playerId);
          replaced = true;
          break;
        }
      }
    }

    if (!replaced) {
      continue;
    }
  }

  return {
    effectivePlayerIds: effectiveStarters,
    substitutedIn,
    substitutedOut,
  };
}
