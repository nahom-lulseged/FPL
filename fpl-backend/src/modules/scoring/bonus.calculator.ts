export interface BonusCandidate {
  playerId: string;
  realTeamId: string;
  bps: number;
  bonus: number;
}

export interface FixtureBonusGroup {
  fixtureId: string;
  homeTeamId: string;
  awayTeamId: string;
  players: BonusCandidate[];
}

const BONUS_AWARDS = [3, 2, 1] as const;

/**
 * Split FPL bonus points among tied BPS ranks within a fixture.
 * Tied players share the combined bonus for the positions they occupy.
 */
export function calculateFixtureBonus(bpsValues: number[]): Map<number, number> {
  const bonusByIndex = new Map<number, number>();
  if (bpsValues.length === 0) {
    return bonusByIndex;
  }

  const sorted = bpsValues
    .map((bps, index) => ({ bps, index }))
    .filter((entry) => entry.bps > 0)
    .sort((a, b) => b.bps - a.bps);

  if (sorted.length === 0) {
    return bonusByIndex;
  }

  let position = 0;
  let i = 0;

  while (i < sorted.length && position < BONUS_AWARDS.length) {
    const currentBps = sorted[i]!.bps;
    const tied: typeof sorted = [];

    while (i < sorted.length && sorted[i]!.bps === currentBps) {
      tied.push(sorted[i]!);
      i += 1;
    }

    const slotsAvailable = BONUS_AWARDS.length - position;
    const slotsUsed = Math.min(tied.length, slotsAvailable);
    const totalBonus = BONUS_AWARDS.slice(position, position + slotsUsed).reduce(
      (sum, pts) => sum + pts,
      0,
    );
    const share = Math.floor((totalBonus / tied.length) * 10) / 10;

    for (const entry of tied.slice(0, slotsUsed)) {
      bonusByIndex.set(entry.index, share);
    }

    position += slotsUsed;
  }

  return bonusByIndex;
}

export function calculateProvisionalBonusForFixture(
  players: BonusCandidate[],
): Map<string, number> {
  const result = new Map<string, number>();
  const eligible = players.filter((p) => p.bonus === 0 && p.bps > 0);

  if (eligible.length === 0) {
    return result;
  }

  const bonusByIndex = calculateFixtureBonus(eligible.map((p) => p.bps));

  eligible.forEach((player, index) => {
    const bonus = bonusByIndex.get(index);
    if (bonus !== undefined && bonus > 0) {
      result.set(player.playerId, bonus);
    }
  });

  return result;
}

export function groupPlayersByFixture(
  fixtures: Array<{ id: string; homeTeamId: string; awayTeamId: string }>,
  players: BonusCandidate[],
): FixtureBonusGroup[] {
  const playersByTeam = new Map<string, BonusCandidate[]>();
  for (const player of players) {
    const list = playersByTeam.get(player.realTeamId) ?? [];
    list.push(player);
    playersByTeam.set(player.realTeamId, list);
  }

  return fixtures.map((fixture) => ({
    fixtureId: fixture.id,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    players: [
      ...(playersByTeam.get(fixture.homeTeamId) ?? []),
      ...(playersByTeam.get(fixture.awayTeamId) ?? []),
    ],
  }));
}

export function calculateProvisionalBonusForGameweek(
  fixtures: Array<{ id: string; homeTeamId: string; awayTeamId: string }>,
  players: BonusCandidate[],
): Map<string, number> {
  const groups = groupPlayersByFixture(fixtures, players);
  const result = new Map<string, number>();

  for (const group of groups) {
    const fixtureBonus = calculateProvisionalBonusForFixture(group.players);
    for (const [playerId, bonus] of fixtureBonus) {
      result.set(playerId, bonus);
    }
  }

  return result;
}
