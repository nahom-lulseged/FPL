import { describe, expect, it } from 'vitest';
import { buildAutoPickSquad, fillRemainingSlots } from '@/lib/autoPickSquad';
import {
  assignLineupForFormation,
  DEFAULT_FORMATION,
  getClubCounts,
  getPositionCounts,
  getRemainingBudget,
  POSITION_LIMITS,
  SQUAD_SIZE,
} from '@/lib/fplRules';
import { DEFAULT_PLAYER_STATS, type PlayerListItem, type Position } from '@/types/player';

function makePlayer(
  id: string,
  position: Position,
  price: number,
  totalPoints: number,
  teamId: string,
  selectedByPercent = 0,
): PlayerListItem {
  return {
    id,
    name: `Player ${id}`,
    position,
    price,
    isAvailable: true,
    realTeam: { id: teamId, name: `Team ${teamId}`, shortName: teamId.toUpperCase().slice(0, 3) },
    ...DEFAULT_PLAYER_STATS,
    totalPoints,
    selectedByPercent,
  };
}

/** Cheap fillers across all positions (enough for a full valid squad). */
function buildCheapFillerPool(): PlayerListItem[] {
  const players: PlayerListItem[] = [];
  const specs: Array<{ position: Position; count: number; price: number }> = [
    { position: 'GK', count: 4, price: 40 },
    { position: 'DEF', count: 10, price: 40 },
    { position: 'MID', count: 10, price: 45 },
    { position: 'FWD', count: 6, price: 45 },
  ];

  let index = 0;
  for (const spec of specs) {
    for (let i = 0; i < spec.count; i++) {
      players.push(
        makePlayer(`cheap-${index}`, spec.position, spec.price, 10 + i, `cheap-team-${index}`),
      );
      index++;
    }
  }

  return players;
}

function buildPremiumOnlyPool(): PlayerListItem[] {
  const players: PlayerListItem[] = [];
  const specs: Array<{ position: Position; count: number; price: number }> = [
    { position: 'GK', count: 10, price: 55 },
    { position: 'DEF', count: 20, price: 75 },
    { position: 'MID', count: 40, price: 90 },
    { position: 'FWD', count: 30, price: 110 },
  ];

  let index = 0;
  for (const spec of specs) {
    for (let i = 0; i < spec.count; i++) {
      players.push(makePlayer(`premium-${index}`, spec.position, spec.price, 150, `club-${index % 20}`));
      index++;
    }
  }

  return players;
}

function assertValidSquad(squad: PlayerListItem[]) {
  expect(squad).toHaveLength(SQUAD_SIZE);
  expect(getRemainingBudget(squad)).toBeGreaterThanOrEqual(0);
  const counts = getPositionCounts(squad);
  for (const position of Object.keys(POSITION_LIMITS) as Position[]) {
    expect(counts[position]).toBe(POSITION_LIMITS[position]);
  }
  const clubCounts = getClubCounts(squad);
  expect([...clubCounts.values()].every((count) => count <= 3)).toBe(true);
}

describe('buildAutoPickSquad', () => {
  it('returns 15 players within budget when enough cheap players exist', () => {
    const squad = buildAutoPickSquad(buildCheapFillerPool());

    expect(squad).not.toBeNull();
    assertValidSquad(squad!);
  });

  it('returns null for a premium-only pool that cannot fit budget', () => {
    const squad = buildAutoPickSquad(buildPremiumOnlyPool());
    expect(squad).toBeNull();
  });

  it('respects the max-3-per-club rule', () => {
    const squad = buildAutoPickSquad(buildCheapFillerPool());
    expect(squad).not.toBeNull();
    assertValidSquad(squad!);
  });

  it('prefers high totalPoints players when budget allows (top-heavy)', () => {
    const fillers = buildCheapFillerPool();
    const premiums = [
      makePlayer('star-mid', 'MID', 120, 250, 'star-a'),
      makePlayer('star-fwd', 'FWD', 130, 240, 'star-b'),
      makePlayer('star-def', 'DEF', 70, 200, 'star-c'),
    ];
    const candidates = [...fillers, ...premiums];

    const squad = buildAutoPickSquad(candidates);

    expect(squad).not.toBeNull();
    assertValidSquad(squad!);
    const ids = new Set(squad!.map((player) => player.id));
    expect(ids.has('star-mid')).toBe(true);
    expect(ids.has('star-fwd')).toBe(true);
    expect(ids.has('star-def')).toBe(true);
  });
});

describe('fillRemainingSlots', () => {
  it('preserves existing picks and fills empty slots only', () => {
    const fillers = buildCheapFillerPool();
    const locked = [
      makePlayer('manual-gk', 'GK', 50, 80, 'manual-a'),
      makePlayer('manual-def', 'DEF', 45, 70, 'manual-b'),
      makePlayer('manual-mid', 'MID', 55, 90, 'manual-c'),
      makePlayer('manual-fwd', 'FWD', 60, 95, 'manual-d'),
      makePlayer('manual-mid-2', 'MID', 50, 75, 'manual-e'),
    ];

    const squad = fillRemainingSlots(locked, [...locked, ...fillers]);

    expect(squad).not.toBeNull();
    assertValidSquad(squad!);
    for (const player of locked) {
      expect(squad!.some((picked) => picked.id === player.id)).toBe(true);
    }
  });

  it('returns the existing squad when already full', () => {
    const full = buildAutoPickSquad(buildCheapFillerPool());
    expect(full).not.toBeNull();
    const squad = fillRemainingSlots(full!, full!);
    expect(squad).toEqual(full);
  });

  it('does not replace locked existing players with higher-ranked alternatives', () => {
    const lockedMid = makePlayer('locked-mid', 'MID', 50, 20, 'locked-team');
    const fillers = buildCheapFillerPool();
    const betterMid = makePlayer('better-mid', 'MID', 55, 200, 'upgrade-mid-team');

    const squad = fillRemainingSlots([lockedMid], [lockedMid, ...fillers, betterMid]);

    expect(squad).not.toBeNull();
    expect(squad!.find((player) => player.id === 'locked-mid')).toBeDefined();
    // Locked mid stays even though better-mid ranks higher
    expect(squad!.find((player) => player.id === 'locked-mid')?.totalPoints).toBe(20);
  });
});

describe('assignLineupForFormation (premium starters)', () => {
  it('starts expensive players and puts bench GK first', () => {
    const players: PlayerListItem[] = [
      makePlayer('gk-cheap', 'GK', 40, 10, 't1'),
      makePlayer('gk-prem', 'GK', 55, 80, 't2'),
      makePlayer('def1', 'DEF', 70, 50, 't3'),
      makePlayer('def2', 'DEF', 45, 20, 't4'),
      makePlayer('def3', 'DEF', 50, 30, 't5'),
      makePlayer('def4', 'DEF', 40, 15, 't6'),
      makePlayer('def5', 'DEF', 42, 18, 't7'),
      makePlayer('mid1', 'MID', 120, 200, 't8'),
      makePlayer('mid2', 'MID', 80, 100, 't9'),
      makePlayer('mid3', 'MID', 60, 60, 't10'),
      makePlayer('mid4', 'MID', 50, 40, 't11'),
      makePlayer('mid5', 'MID', 45, 20, 't12'),
      makePlayer('fwd1', 'FWD', 130, 220, 't13'),
      makePlayer('fwd2', 'FWD', 75, 90, 't14'),
      makePlayer('fwd3', 'FWD', 55, 40, 't15'),
    ];

    const lineup = assignLineupForFormation(players, DEFAULT_FORMATION);
    const byId = new Map(lineup.map((slot) => [slot.playerId, slot]));

    expect(byId.get('gk-prem')?.isStarter).toBe(true);
    expect(byId.get('gk-cheap')?.isStarter).toBe(false);
    expect(byId.get('gk-cheap')?.benchOrder).toBe(1);

    expect(byId.get('mid1')?.isStarter).toBe(true);
    expect(byId.get('fwd1')?.isStarter).toBe(true);
    expect(byId.get('mid1')?.isCaptain).toBe(false);
    expect(byId.get('fwd1')?.isCaptain).toBe(true);
    expect(byId.get('mid1')?.isViceCaptain).toBe(true);

    const benchOutfield = lineup
      .filter((slot) => !slot.isStarter && slot.playerId !== 'gk-cheap')
      .sort((a, b) => (a.benchOrder ?? 0) - (b.benchOrder ?? 0));
    expect(benchOutfield[0]?.benchOrder).toBe(2);
  });
});
