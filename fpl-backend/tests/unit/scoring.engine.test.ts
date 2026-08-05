import type { Position } from '@prisma/client';
import { scoreTeamGameweek } from '../../src/modules/scoring/scoring.engine';
import type { PlayerGwInput, SnapshotSlot } from '../../src/modules/scoring/scoring.types';

function slot(
  id: string,
  position: Position,
  opts: Partial<SnapshotSlot> = {},
): SnapshotSlot {
  return {
    playerId: id,
    position,
    isStarter: opts.isStarter ?? false,
    benchOrder: opts.benchOrder ?? null,
    isCaptain: opts.isCaptain ?? false,
    isViceCaptain: opts.isViceCaptain ?? false,
  };
}

function buildMinimalSnapshot(): SnapshotSlot[] {
  return [
    slot('gk1', 'GK', { isStarter: true }),
    slot('d1', 'DEF', { isStarter: true }),
    slot('d2', 'DEF', { isStarter: true }),
    slot('d3', 'DEF', { isStarter: true }),
    slot('d4', 'DEF', { isStarter: true }),
    slot('m1', 'MID', { isStarter: true, isCaptain: true }),
    slot('m2', 'MID', { isStarter: true, isViceCaptain: true }),
    slot('m3', 'MID', { isStarter: true }),
    slot('m4', 'MID', { isStarter: true }),
    slot('f1', 'FWD', { isStarter: true }),
    slot('f2', 'FWD', { isStarter: true }),
    slot('gk2', 'GK', { benchOrder: 2 }),
    slot('d5', 'DEF', { benchOrder: 1 }),
    slot('m5', 'MID', { benchOrder: 3 }),
    slot('f3', 'FWD', { benchOrder: 4 }),
  ];
}

function defaultStats(snapshot: SnapshotSlot[]): Map<string, PlayerGwInput> {
  return new Map(
    snapshot.map((s) => [
      s.playerId,
      {
        playerId: s.playerId,
        position: s.position,
        minutes: 90,
        points: 2,
      },
    ]),
  );
}

describe('scoreTeamGameweek', () => {
  it('sums starter points and applies captain multiplier', () => {
    const snapshot = buildMinimalSnapshot();
    const stats = defaultStats(snapshot);
    stats.set('m1', { playerId: 'm1', position: 'MID', minutes: 90, points: 10 });

    const result = scoreTeamGameweek(snapshot, stats);

    expect(result.startersPoints).toBe(10 + 2 * 10);
    expect(result.captainBonus).toBe(10);
    expect(result.totalPoints).toBe(result.startersPoints + result.captainBonus);

    const captain = result.players.find((p) => p.playerId === 'm1');
    expect(captain?.captainMultiplier).toBe(2);
    expect(captain?.effectivePoints).toBe(20);
  });

  it('promotes vice-captain when captain did not play', () => {
    const snapshot = buildMinimalSnapshot();
    const stats = defaultStats(snapshot);
    stats.set('m1', { playerId: 'm1', position: 'MID', minutes: 0, points: 0 });
    stats.set('m2', { playerId: 'm2', position: 'MID', minutes: 90, points: 8 });

    const result = scoreTeamGameweek(snapshot, stats);

    const vice = result.players.find((p) => p.playerId === 'm2');
    expect(vice?.captainMultiplier).toBe(2);
    expect(vice?.effectivePoints).toBe(16);
    expect(result.captainBonus).toBe(8);
  });

  it('excludes bench players from counted points', () => {
    const snapshot = buildMinimalSnapshot();
    const stats = defaultStats(snapshot);
    stats.set('d5', { playerId: 'd5', position: 'DEF', minutes: 90, points: 15 });

    const result = scoreTeamGameweek(snapshot, stats);

    const benchDef = result.players.find((p) => p.playerId === 'd5');
    expect(benchDef?.counted).toBe(false);
    expect(benchDef?.effectivePoints).toBe(0);
  });

  it('includes bench points with bench boost chip', () => {
    const snapshot = buildMinimalSnapshot();
    const stats = defaultStats(snapshot);
    for (const slot of snapshot) {
      if (!slot.isStarter) {
        stats.set(slot.playerId, {
          playerId: slot.playerId,
          position: slot.position,
          minutes: slot.playerId === 'd5' ? 90 : 0,
          points: slot.playerId === 'd5' ? 6 : 0,
        });
      }
    }

    const result = scoreTeamGameweek(snapshot, stats, 0, { benchBoost: true });

    expect(result.benchPoints).toBe(6);
    expect(result.totalPoints).toBeGreaterThan(
      scoreTeamGameweek(snapshot, stats).totalPoints,
    );
  });

  it('applies triple captain multiplier', () => {
    const snapshot = buildMinimalSnapshot();
    const stats = defaultStats(snapshot);
    stats.set('m1', { playerId: 'm1', position: 'MID', minutes: 90, points: 10 });

    const result = scoreTeamGameweek(snapshot, stats, 0, { tripleCaptain: true });

    const captain = result.players.find((p) => p.playerId === 'm1');
    expect(captain?.captainMultiplier).toBe(3);
    expect(captain?.effectivePoints).toBe(30);
    expect(result.captainBonus).toBe(20);
  });
});
