import { describe, expect, it } from 'vitest';
import { DEFAULT_FORMATION, SQUAD_SIZE, type LineupSlot } from '@/lib/fplRules';
import {
  autoFillLineup,
  getPickTeamErrors,
  reflowForFormation,
  setCaptainInPlace,
  setViceCaptainInPlace,
  swapLineupSlots,
} from '@/lib/pickTeamLineup';
import { DEFAULT_PLAYER_STATS, type PlayerListItem, type Position } from '@/types/player';

function makePlayer(
  id: string,
  position: Position,
  price: number,
  totalPoints: number,
): PlayerListItem {
  return {
    id,
    name: `Player ${id}`,
    position,
    price,
    isAvailable: true,
    realTeam: { id: `t-${id}`, name: `Team ${id}`, shortName: id.slice(0, 3).toUpperCase() },
    ...DEFAULT_PLAYER_STATS,
    totalPoints,
  };
}

function buildSquad(): PlayerListItem[] {
  const players: PlayerListItem[] = [];
  const specs: Array<{ position: Position; count: number; basePrice: number }> = [
    { position: 'GK', count: 2, basePrice: 45 },
    { position: 'DEF', count: 5, basePrice: 45 },
    { position: 'MID', count: 5, basePrice: 60 },
    { position: 'FWD', count: 3, basePrice: 70 },
  ];
  let i = 0;
  for (const spec of specs) {
    for (let n = 0; n < spec.count; n++) {
      players.push(
        makePlayer(`${spec.position}-${n}`, spec.position, spec.basePrice + n * 5, 100 - i * 3),
      );
      i++;
    }
  }
  return players;
}

describe('pickTeamLineup', () => {
  it('autoFillLineup builds a valid 15 with C/VC and bench GK first', () => {
    const players = buildSquad();
    const lineup = autoFillLineup(players, DEFAULT_FORMATION);

    expect(lineup).toHaveLength(SQUAD_SIZE);
    expect(getPickTeamErrors(lineup, players)).toEqual([]);
    expect(lineup.filter((s) => s.isStarter)).toHaveLength(11);
    expect(lineup.filter((s) => s.isCaptain)).toHaveLength(1);
    expect(lineup.filter((s) => s.isViceCaptain)).toHaveLength(1);

    const bench = lineup
      .filter((s) => !s.isStarter)
      .sort((a, b) => (a.benchOrder ?? 0) - (b.benchOrder ?? 0));
    const benchGk = players.find((p) => p.id === bench[0]?.playerId);
    expect(benchGk?.position).toBe('GK');
  });

  it('setCaptainInPlace does not reshuffle starters', () => {
    const players = buildSquad();
    const lineup = autoFillLineup(players, DEFAULT_FORMATION);
    const starterIdsBefore = lineup
      .filter((s) => s.isStarter)
      .map((s) => s.playerId)
      .sort();

    const nonCaptain = lineup.find((s) => s.isStarter && !s.isCaptain && !s.isViceCaptain)!;
    const result = setCaptainInPlace(lineup, nonCaptain.playerId);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const starterIdsAfter = result.lineup
      .filter((s) => s.isStarter)
      .map((s) => s.playerId)
      .sort();
    expect(starterIdsAfter).toEqual(starterIdsBefore);
    expect(result.lineup.find((s) => s.playerId === nonCaptain.playerId)?.isCaptain).toBe(true);
  });

  it('setViceCaptainInPlace rejects the captain', () => {
    const players = buildSquad();
    const lineup = autoFillLineup(players, DEFAULT_FORMATION);
    const captain = lineup.find((s) => s.isCaptain)!;
    const result = setViceCaptainInPlace(lineup, captain.playerId);
    expect(result.ok).toBe(false);
  });

  it('swapLineupSlots swaps a starter with a same-position bench player', () => {
    const players = buildSquad();
    const lineup = autoFillLineup(players, DEFAULT_FORMATION);
    const starterMid = lineup.find((s) => {
      if (!s.isStarter) {
        return false;
      }
      return players.find((p) => p.id === s.playerId)?.position === 'MID';
    })!;
    const benchMid = lineup.find((s) => {
      if (s.isStarter) {
        return false;
      }
      return players.find((p) => p.id === s.playerId)?.position === 'MID';
    })!;

    const result = swapLineupSlots(
      lineup,
      starterMid.playerId,
      benchMid.playerId,
      players,
      DEFAULT_FORMATION,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.lineup.find((s) => s.playerId === benchMid.playerId)?.isStarter).toBe(true);
    expect(result.lineup.find((s) => s.playerId === starterMid.playerId)?.isStarter).toBe(false);
    expect(getPickTeamErrors(result.lineup, players)).toEqual([]);
  });

  it('swapLineupSlots rejects a goalkeeper and outfield switch without changing the lineup', () => {
    const players = buildSquad();
    const lineup = autoFillLineup(players, DEFAULT_FORMATION);
    const startingGk = lineup.find(
      (slot) =>
        slot.isStarter && players.find((player) => player.id === slot.playerId)?.position === 'GK',
    )!;
    const benchOutfield = lineup.find(
      (slot) =>
        !slot.isStarter && players.find((player) => player.id === slot.playerId)?.position !== 'GK',
    )!;
    const before = structuredClone(lineup);

    const result = swapLineupSlots(
      lineup,
      startingGk.playerId,
      benchOutfield.playerId,
      players,
      DEFAULT_FORMATION,
    );

    expect(result.ok).toBe(false);
    expect(lineup).toEqual(before);
  });

  it('swapLineupSlots keeps captaincy valid when the captain moves to the bench', () => {
    const players = buildSquad();
    const lineup = autoFillLineup(players, DEFAULT_FORMATION);
    const captain = lineup.find((slot) => slot.isCaptain)!;
    const captainPosition = players.find((player) => player.id === captain.playerId)!.position;
    const benchReplacement = lineup.find(
      (slot) =>
        !slot.isStarter &&
        players.find((player) => player.id === slot.playerId)?.position === captainPosition,
    );
    expect(benchReplacement).toBeDefined();

    const result = swapLineupSlots(
      lineup,
      captain.playerId,
      benchReplacement!.playerId,
      players,
      DEFAULT_FORMATION,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lineup.find((slot) => slot.playerId === captain.playerId)?.isCaptain).toBe(false);
    expect(result.lineup.find((slot) => slot.isCaptain)?.isStarter).toBe(true);
    expect(result.lineup.find((slot) => slot.isViceCaptain)?.isStarter).toBe(true);
    expect(getPickTeamErrors(result.lineup, players)).toEqual([]);
  });

  it('reflowForFormation benches excess defenders when moving to 3-at-the-back', () => {
    const players = buildSquad();
    const lineup = autoFillLineup(players, DEFAULT_FORMATION); // 4-4-2
    const next = reflowForFormation(lineup, players, { def: 3, mid: 5, fwd: 2 });
    const defStarters = next.filter((s) => {
      if (!s.isStarter) {
        return false;
      }
      return players.find((p) => p.id === s.playerId)?.position === 'DEF';
    });
    expect(defStarters).toHaveLength(3);
    expect(getPickTeamErrors(next, players)).toEqual([]);
  });

  it('preserves locked starter set size after captain change', () => {
    const players = buildSquad();
    let lineup: LineupSlot[] = autoFillLineup(players, DEFAULT_FORMATION);
    const starter = lineup.find((s) => s.isStarter && !s.isCaptain)!;
    const result = setCaptainInPlace(lineup, starter.playerId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      lineup = result.lineup;
    }
    expect(lineup.filter((s) => s.isStarter)).toHaveLength(11);
  });
});
