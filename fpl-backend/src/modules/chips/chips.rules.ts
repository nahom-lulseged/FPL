import type { ChipType } from '@prisma/client';
import { WILDCARD_SECOND_HALF_START_GW } from '../../lib/constants';
import type { PlayerGwInput, SnapshotSlot } from '../scoring/scoring.types';

export interface ChipUsageRecord {
  chipType: ChipType;
  gameweekNumber: number;
  wildcardNumber: number | null;
}

export type ChipPlayError =
  | 'ALREADY_USED'
  | 'CHIP_THIS_GW'
  | 'INVALID_WILDCARD_NUMBER'
  | 'WILDCARD_NUMBER_USED';

export function isUnlimitedTransferChip(chipType: ChipType): boolean {
  return chipType === 'WILDCARD' || chipType === 'FREE_HIT';
}

export function validateWildcardNumber(
  gwNumber: number,
  wildcardNumber: number,
): { ok: true } | { ok: false; error: ChipPlayError } {
  if (wildcardNumber !== 1 && wildcardNumber !== 2) {
    return { ok: false, error: 'INVALID_WILDCARD_NUMBER' };
  }
  if (wildcardNumber === 1 && gwNumber >= WILDCARD_SECOND_HALF_START_GW) {
    return { ok: false, error: 'INVALID_WILDCARD_NUMBER' };
  }
  if (wildcardNumber === 2 && gwNumber < WILDCARD_SECOND_HALF_START_GW) {
    return { ok: false, error: 'INVALID_WILDCARD_NUMBER' };
  }
  return { ok: true };
}

function isChipAlreadyUsed(
  chipType: ChipType,
  usages: ChipUsageRecord[],
  wildcardNumber?: number,
): boolean {
  if (chipType === 'WILDCARD') {
    return usages.some(
      (u) => u.chipType === 'WILDCARD' && u.wildcardNumber === wildcardNumber,
    );
  }
  return usages.some((u) => u.chipType === chipType);
}

export function canPlayChip(
  chipType: ChipType,
  usages: ChipUsageRecord[],
  gwNumber: number,
  wildcardNumber?: number,
): { ok: true } | { ok: false; error: ChipPlayError } {
  const chipThisGw = usages.find((u) => u.gameweekNumber === gwNumber);
  if (chipThisGw) {
    return { ok: false, error: 'CHIP_THIS_GW' };
  }

  if (chipType === 'WILDCARD') {
    if (wildcardNumber === undefined) {
      return { ok: false, error: 'INVALID_WILDCARD_NUMBER' };
    }
    const wcValidation = validateWildcardNumber(gwNumber, wildcardNumber);
    if (!wcValidation.ok) {
      return wcValidation;
    }
    if (isChipAlreadyUsed(chipType, usages, wildcardNumber)) {
      return { ok: false, error: 'WILDCARD_NUMBER_USED' };
    }
    return { ok: true };
  }

  if (isChipAlreadyUsed(chipType, usages)) {
    return { ok: false, error: 'ALREADY_USED' };
  }

  return { ok: true };
}

export function calculateBenchBoostPoints(
  snapshot: SnapshotSlot[],
  effectiveSet: Set<string>,
  substitutedIn: Set<string>,
  statsByPlayerId: Map<string, PlayerGwInput>,
): number {
  let benchPoints = 0;
  for (const slot of snapshot) {
    if (!slot.isStarter && !substitutedIn.has(slot.playerId)) {
      const stats = statsByPlayerId.get(slot.playerId);
      benchPoints += stats?.points ?? 0;
    }
  }
  return benchPoints;
}

export function chipPlayErrorMessage(error: ChipPlayError): string {
  switch (error) {
    case 'ALREADY_USED':
      return 'This chip has already been used this season';
    case 'CHIP_THIS_GW':
      return 'Only one chip can be played per gameweek';
    case 'INVALID_WILDCARD_NUMBER':
      return 'Invalid wildcard number for this gameweek';
    case 'WILDCARD_NUMBER_USED':
      return 'This wildcard has already been used this season';
  }
}

export function buildChipAvailability(
  usages: ChipUsageRecord[],
  gwNumber: number,
): Record<string, boolean | Record<string, boolean>> {
  const usedWildcard1 = usages.some(
    (u) => u.chipType === 'WILDCARD' && u.wildcardNumber === 1,
  );
  const usedWildcard2 = usages.some(
    (u) => u.chipType === 'WILDCARD' && u.wildcardNumber === 2,
  );
  const chipThisGw = usages.some((u) => u.gameweekNumber === gwNumber);

  return {
    WILDCARD: {
      '1': !usedWildcard1 && gwNumber < WILDCARD_SECOND_HALF_START_GW && !chipThisGw,
      '2': !usedWildcard2 && gwNumber >= WILDCARD_SECOND_HALF_START_GW && !chipThisGw,
    },
    FREE_HIT: !usages.some((u) => u.chipType === 'FREE_HIT') && !chipThisGw,
    BENCH_BOOST: !usages.some((u) => u.chipType === 'BENCH_BOOST') && !chipThisGw,
    TRIPLE_CAPTAIN:
      !usages.some((u) => u.chipType === 'TRIPLE_CAPTAIN') && !chipThisGw,
  };
}
