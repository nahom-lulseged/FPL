import { formatPrice } from '@/lib/formatters';
import type { FixtureListItem } from '@/types/fixture';
import type { PlayerListItem } from '@/types/player';

export type SquadDisplayMetric = 'opponent' | 'price' | 'fdr' | 'ownership';

export interface PlayerFixtureDisplay {
  opponent: string;
  fdr: string;
  price: string;
  ownership: string;
}

export function formatKickoffTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatFixtureDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

export function buildFixtureMap(fixtures: FixtureListItem[]): Map<string, FixtureListItem[]> {
  const byTeam = new Map<string, FixtureListItem[]>();

  for (const fixture of fixtures) {
    const teams = [fixture.homeTeam.id, fixture.awayTeam.id];
    for (const teamId of teams) {
      const current = byTeam.get(teamId) ?? [];
      current.push(fixture);
      byTeam.set(teamId, current);
    }
  }

  for (const teamFixtures of byTeam.values()) {
    teamFixtures.sort(
      (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime(),
    );
  }

  return byTeam;
}

export function getFixtureDisplay(
  player: PlayerListItem,
  fixtureMap: Map<string, FixtureListItem[]>,
): PlayerFixtureDisplay {
  const fixtures = fixtureMap.get(player.realTeam.id) ?? [];
  const opponent = fixtures
    .map((fixture) => {
      const isHome = fixture.homeTeam.id === player.realTeam.id;
      const opponentTeam = isHome ? fixture.awayTeam : fixture.homeTeam;
      return `${opponentTeam.shortName} (${isHome ? 'H' : 'A'})`;
    })
    .join(', ');
  const fdr = fixtures
    .map((fixture) => {
      const isHome = fixture.homeTeam.id === player.realTeam.id;
      const difficulty = isHome ? fixture.homeDifficulty : fixture.awayDifficulty;
      return difficulty == null ? '-' : String(difficulty);
    })
    .join(', ');

  return {
    opponent: opponent || '-',
    fdr: fdr || '-',
    price: formatPrice(player.price),
    ownership: `${(player.selectedByPercent ?? 0).toFixed(1)}%`,
  };
}

export function getMetricValue(
  player: PlayerListItem,
  fixtureMap: Map<string, FixtureListItem[]>,
  metric: SquadDisplayMetric,
): string {
  return getFixtureDisplay(player, fixtureMap)[metric];
}
