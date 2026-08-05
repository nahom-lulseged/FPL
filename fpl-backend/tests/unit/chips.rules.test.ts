import type { ChipType } from '@prisma/client';
import {
  buildChipAvailability,
  calculateBenchBoostPoints,
  canPlayChip,
  isUnlimitedTransferChip,
  validateWildcardNumber,
} from '../../src/modules/chips/chips.rules';
import type { PlayerGwInput, SnapshotSlot } from '../../src/modules/scoring/scoring.types';

describe('chips.rules', () => {
  describe('isUnlimitedTransferChip', () => {
    it('returns true for wildcard and free hit', () => {
      expect(isUnlimitedTransferChip('WILDCARD')).toBe(true);
      expect(isUnlimitedTransferChip('FREE_HIT')).toBe(true);
    });

    it('returns false for bench boost and triple captain', () => {
      expect(isUnlimitedTransferChip('BENCH_BOOST')).toBe(false);
      expect(isUnlimitedTransferChip('TRIPLE_CAPTAIN')).toBe(false);
    });
  });

  describe('validateWildcardNumber', () => {
    it('allows WC1 before GW20', () => {
      expect(validateWildcardNumber(5, 1).ok).toBe(true);
      expect(validateWildcardNumber(19, 1).ok).toBe(true);
    });

    it('rejects WC1 from GW20 onward', () => {
      expect(validateWildcardNumber(20, 1).ok).toBe(false);
    });

    it('allows WC2 from GW20 onward', () => {
      expect(validateWildcardNumber(20, 2).ok).toBe(true);
    });

    it('rejects WC2 before GW20', () => {
      expect(validateWildcardNumber(19, 2).ok).toBe(false);
    });
  });

  describe('canPlayChip', () => {
    const usages = [
      { chipType: 'WILDCARD' as ChipType, gameweekNumber: 3, wildcardNumber: 1 },
    ];

    it('rejects replaying a used chip', () => {
      const result = canPlayChip('WILDCARD', usages, 5, 1);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('WILDCARD_NUMBER_USED');
      }
    });

    it('rejects second chip in same gameweek', () => {
      const result = canPlayChip('BENCH_BOOST', usages, 3);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('CHIP_THIS_GW');
      }
    });

    it('allows unused chip in new gameweek', () => {
      const result = canPlayChip('BENCH_BOOST', usages, 5);
      expect(result.ok).toBe(true);
    });
  });

  describe('calculateBenchBoostPoints', () => {
    it('sums points for bench players not subbed in', () => {
      const snapshot: SnapshotSlot[] = [
        {
          playerId: 's1',
          position: 'MID',
          isStarter: true,
          benchOrder: null,
          isCaptain: false,
          isViceCaptain: false,
        },
        {
          playerId: 'b1',
          position: 'DEF',
          isStarter: false,
          benchOrder: 1,
          isCaptain: false,
          isViceCaptain: false,
        },
        {
          playerId: 'b2',
          position: 'MID',
          isStarter: false,
          benchOrder: 2,
          isCaptain: false,
          isViceCaptain: false,
        },
      ];
      const stats = new Map<string, PlayerGwInput>([
        ['s1', { playerId: 's1', position: 'MID', minutes: 90, points: 5 }],
        ['b1', { playerId: 'b1', position: 'DEF', minutes: 90, points: 8 }],
        ['b2', { playerId: 'b2', position: 'MID', minutes: 0, points: 0 }],
      ]);
      const effectiveSet = new Set(['s1']);
      const substitutedIn = new Set<string>();

      expect(
        calculateBenchBoostPoints(snapshot, effectiveSet, substitutedIn, stats),
      ).toBe(8);
    });

    it('excludes bench players who were subbed in', () => {
      const snapshot: SnapshotSlot[] = [
        {
          playerId: 'b1',
          position: 'DEF',
          isStarter: false,
          benchOrder: 1,
          isCaptain: false,
          isViceCaptain: false,
        },
      ];
      const stats = new Map<string, PlayerGwInput>([
        ['b1', { playerId: 'b1', position: 'DEF', minutes: 90, points: 6 }],
      ]);

      expect(
        calculateBenchBoostPoints(
          snapshot,
          new Set(['b1']),
          new Set(['b1']),
          stats,
        ),
      ).toBe(0);
    });
  });

  describe('buildChipAvailability', () => {
    it('marks WC1 unavailable from GW20', () => {
      const availability = buildChipAvailability([], 20);
      const wildcard = availability.WILDCARD as Record<string, boolean>;
      expect(wildcard['1']).toBe(false);
      expect(wildcard['2']).toBe(true);
    });
  });
});
