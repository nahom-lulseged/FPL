import {
  applyStatCorrection,
  calculatePlayerPoints,
  toPlayerStatsInput,
} from '../../src/modules/scoring/playerPoints.calculator';

const zeroStats = toPlayerStatsInput({
  minutes: 0,
  goals: 0,
  assists: 0,
  cleanSheet: false,
  goalsConceded: 0,
  saves: 0,
  yellowCards: 0,
  redCards: 0,
  ownGoals: 0,
  penaltiesMissed: 0,
  penaltiesSaved: 0,
  bonus: 0,
  bps: 0,
});

describe('calculatePlayerPoints', () => {
  it('awards appearance points by minutes', () => {
    expect(calculatePlayerPoints({ ...zeroStats, minutes: 45 }, 'MID')).toBe(1);
    expect(calculatePlayerPoints({ ...zeroStats, minutes: 90 }, 'MID')).toBe(2);
    expect(calculatePlayerPoints({ ...zeroStats, minutes: 0 }, 'MID')).toBe(0);
  });

  it('scores goals by position', () => {
    expect(calculatePlayerPoints({ ...zeroStats, minutes: 90, goals: 1 }, 'FWD')).toBe(6);
    expect(calculatePlayerPoints({ ...zeroStats, minutes: 90, goals: 1 }, 'MID')).toBe(7);
    expect(calculatePlayerPoints({ ...zeroStats, minutes: 90, goals: 1 }, 'DEF')).toBe(8);
  });

  it('scores assists, cards, and bonus', () => {
    const stats = {
      ...zeroStats,
      minutes: 90,
      assists: 2,
      yellowCards: 1,
      bonus: 3,
    };
    expect(calculatePlayerPoints(stats, 'MID')).toBe(2 + 6 - 1 + 3);
  });

  it('scores clean sheet for defenders', () => {
    const stats = { ...zeroStats, minutes: 90, cleanSheet: true };
    expect(calculatePlayerPoints(stats, 'DEF')).toBe(6);
    expect(calculatePlayerPoints(stats, 'MID')).toBe(3);
    expect(calculatePlayerPoints(stats, 'FWD')).toBe(2);
  });

  it('deducts goals conceded for keepers', () => {
    const stats = { ...zeroStats, minutes: 90, goalsConceded: 3 };
    expect(calculatePlayerPoints(stats, 'GK')).toBe(1);
  });
});

describe('applyStatCorrection', () => {
  it('recalculates points after goal correction', () => {
    const base = { ...zeroStats, minutes: 90 };
    const result = applyStatCorrection(base, 'goals', 2, 'FWD');
    expect(result.stats.goals).toBe(2);
    expect(result.points).toBe(10);
  });

  it('updates bps without changing points', () => {
    const base = { ...zeroStats, minutes: 90, bonus: 1 };
    const before = calculatePlayerPoints(base, 'MID');
    const result = applyStatCorrection(base, 'bps', 50, 'MID');
    expect(result.stats.bps).toBe(50);
    expect(result.points).toBe(before);
  });
});
