import type { Position } from '@prisma/client';
import { applyAutoSubstitutions } from '../../src/modules/scoring/autoSubstitution';
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

function stats(
  id: string,
  position: Position,
  minutes: number,
  points: number,
): [string, PlayerGwInput] {
  return [id, { playerId: id, position, minutes, points }];
}

function build442Snapshot(): SnapshotSlot[] {
  return [
    slot('gk1', 'GK', { isStarter: true }),
    slot('d1', 'DEF', { isStarter: true }),
    slot('d2', 'DEF', { isStarter: true }),
    slot('d3', 'DEF', { isStarter: true }),
    slot('d4', 'DEF', { isStarter: true }),
    slot('m1', 'MID', { isStarter: true }),
    slot('m2', 'MID', { isStarter: true }),
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

function allPlayedMap(ids: string[], positions: Record<string, Position>): Map<string, PlayerGwInput> {
  return new Map(
    ids.map((id) => stats(id, positions[id]!, 90, 2)),
  );
}

describe('applyAutoSubstitutions', () => {
  const positions: Record<string, Position> = {
    gk1: 'GK',
    gk2: 'GK',
    d1: 'DEF',
    d2: 'DEF',
    d3: 'DEF',
    d4: 'DEF',
    d5: 'DEF',
    m1: 'MID',
    m2: 'MID',
    m3: 'MID',
    m4: 'MID',
    m5: 'MID',
    f1: 'FWD',
    f2: 'FWD',
    f3: 'FWD',
  };

  it('keeps all starters when everyone played', () => {
    const snapshot = build442Snapshot();
    const statsMap = allPlayedMap(Object.keys(positions), positions);

    const result = applyAutoSubstitutions(snapshot, statsMap);

    expect(result.effectivePlayerIds).toHaveLength(11);
    expect(result.effectivePlayerIds).toContain('gk1');
    expect(result.effectivePlayerIds).toContain('f2');
    expect(result.substitutedIn.size).toBe(0);
    expect(result.substitutedOut.size).toBe(0);
  });

  it('subs one outfield DNP starter with first eligible bench player', () => {
    const snapshot = build442Snapshot();
    const statsMap = allPlayedMap(Object.keys(positions), positions);
    statsMap.set('m1', { playerId: 'm1', position: 'MID', minutes: 0, points: 0 });
    statsMap.set('d5', { playerId: 'd5', position: 'DEF', minutes: 90, points: 6 });

    const result = applyAutoSubstitutions(snapshot, statsMap);

    expect(result.effectivePlayerIds).not.toContain('m1');
    expect(result.effectivePlayerIds).toContain('d5');
    expect(result.substitutedIn.has('d5')).toBe(true);
    expect(result.substitutedOut.has('m1')).toBe(true);
  });

  it('subs GK DNP with bench GK only', () => {
    const snapshot = build442Snapshot();
    const statsMap = allPlayedMap(Object.keys(positions), positions);
    statsMap.set('gk1', { playerId: 'gk1', position: 'GK', minutes: 0, points: 0 });
    statsMap.set('gk2', { playerId: 'gk2', position: 'GK', minutes: 90, points: 4 });

    const result = applyAutoSubstitutions(snapshot, statsMap);

    expect(result.effectivePlayerIds).toContain('gk2');
    expect(result.effectivePlayerIds).not.toContain('gk1');
    expect(result.substitutedIn.has('gk2')).toBe(true);
  });

  it('does not sub bench player who did not play', () => {
    const snapshot = build442Snapshot();
    const statsMap = allPlayedMap(Object.keys(positions), positions);
    statsMap.set('f1', { playerId: 'f1', position: 'FWD', minutes: 0, points: 0 });
    statsMap.set('d5', { playerId: 'd5', position: 'DEF', minutes: 0, points: 0 });
    statsMap.set('m5', { playerId: 'm5', position: 'MID', minutes: 0, points: 0 });
    statsMap.set('f3', { playerId: 'f3', position: 'FWD', minutes: 0, points: 0 });

    const result = applyAutoSubstitutions(snapshot, statsMap);

    expect(result.effectivePlayerIds).toContain('f1');
    expect(result.substitutedIn.size).toBe(0);
  });

  it('fills multiple DNPs in bench order', () => {
    const snapshot = build442Snapshot();
    const statsMap = allPlayedMap(Object.keys(positions), positions);
    statsMap.set('d1', { playerId: 'd1', position: 'DEF', minutes: 0, points: 0 });
    statsMap.set('m1', { playerId: 'm1', position: 'MID', minutes: 0, points: 0 });
    statsMap.set('d5', { playerId: 'd5', position: 'DEF', minutes: 90, points: 5 });
    statsMap.set('m5', { playerId: 'm5', position: 'MID', minutes: 90, points: 7 });

    const result = applyAutoSubstitutions(snapshot, statsMap);

    expect(result.effectivePlayerIds).toContain('d5');
    expect(result.effectivePlayerIds).toContain('m5');
    expect(result.substitutedOut.has('d1')).toBe(true);
    expect(result.substitutedOut.has('m1')).toBe(true);
  });
});
