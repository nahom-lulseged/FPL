import { env } from '../../config/env';
import { CACHE_PREFIX, buildCacheKey, getOrSet } from '../../lib/cache';
import {
  fetchBootstrapStatic,
  fetchElementSummary,
  fetchFixtures,
} from '../ingestion/fpl.client';
import type { FplBootstrapStatic, FplTeam } from '../ingestion/fpl.types';
import type { FplFixturesQuery, FplPlayersQuery } from './fplCatalog.validation';

const POSITION_NAMES: Record<number, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

function crestUrl(team: FplTeam): string {
  return `/crests/${team.short_name.toUpperCase()}.webp`;
}

function enrichTeam(team: FplTeam) {
  return {
    ...team,
    shortName: team.short_name,
    crestUrl: crestUrl(team),
  };
}

async function getBootstrap(): Promise<FplBootstrapStatic> {
  return getOrSet(
    CACHE_PREFIX.fplBootstrap,
    env.CACHE_TTL_PLAYERS_SECONDS,
    fetchBootstrapStatic,
  );
}

async function getAllFixtures() {
  return getOrSet(
    CACHE_PREFIX.fplFixtures,
    env.CACHE_TTL_FIXTURES_SECONDS,
    fetchFixtures,
  );
}

export async function getOverview() {
  const [bootstrap, fixtures] = await Promise.all([getBootstrap(), getAllFixtures()]);
  const currentGameweek = bootstrap.events.find((event) => event.is_current) ?? null;
  const nextGameweek = bootstrap.events.find((event) => event.is_next) ?? null;

  return {
    source: 'Fantasy Premier League',
    fetchedAt: new Date().toISOString(),
    totalManagers: bootstrap.total_players ?? null,
    counts: {
      teams: bootstrap.teams.length,
      players: bootstrap.elements.length,
      gameweeks: bootstrap.events.length,
      fixtures: fixtures.length,
    },
    currentGameweek,
    nextGameweek,
    teams: bootstrap.teams.map(enrichTeam).sort((a, b) => (a.position ?? 99) - (b.position ?? 99)),
    positions: bootstrap.element_types ?? [],
    gameSettings: bootstrap.game_settings ?? {},
  };
}

export async function listTeams() {
  const bootstrap = await getBootstrap();
  return {
    data: bootstrap.teams.map(enrichTeam).sort((a, b) => (a.position ?? 99) - (b.position ?? 99)),
  };
}

export async function listGameweeks() {
  const bootstrap = await getBootstrap();
  return { data: bootstrap.events };
}

export async function listPlayers(query: FplPlayersQuery) {
  const bootstrap = await getBootstrap();
  const teamById = new Map(bootstrap.teams.map((team) => [team.id, enrichTeam(team)]));
  const search = query.search?.toLocaleLowerCase();
  const filtered = bootstrap.elements.filter((player) => {
    if (query.team && player.team !== query.team) return false;
    if (query.position && player.element_type !== query.position) return false;
    if (!search) return true;
    return `${player.first_name} ${player.second_name} ${player.web_name}`.toLocaleLowerCase().includes(search);
  }).sort((left, right) => {
    const leftValue = Number(left[query.sortBy] ?? 0);
    const rightValue = Number(right[query.sortBy] ?? 0);
    return query.sortDir === 'asc' ? leftValue - rightValue : rightValue - leftValue;
  });
  const start = (query.page - 1) * query.limit;

  return {
    data: filtered.slice(start, start + query.limit).map((player) => ({
      ...player,
      position: POSITION_NAMES[player.element_type],
      price: player.now_cost / 10,
      selectedByPercent: Number.parseFloat(player.selected_by_percent || '0'),
      teamDetails: teamById.get(player.team) ?? null,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / query.limit)),
    },
  };
}

export async function listFixtures(query: FplFixturesQuery) {
  const [bootstrap, fixtures] = await Promise.all([getBootstrap(), getAllFixtures()]);
  const teamById = new Map(bootstrap.teams.map((team) => [team.id, enrichTeam(team)]));
  const filtered = fixtures.filter((fixture) => {
    if (query.gameweek && fixture.event !== query.gameweek) return false;
    if (query.team && fixture.team_h !== query.team && fixture.team_a !== query.team) return false;
    return true;
  });

  return {
    data: filtered.map((fixture) => ({
      ...fixture,
      homeTeam: teamById.get(fixture.team_h) ?? null,
      awayTeam: teamById.get(fixture.team_a) ?? null,
    })),
    total: filtered.length,
  };
}

export async function getPlayerSummary(id: number) {
  const cacheKey = buildCacheKey(CACHE_PREFIX.fplPlayerSummary, { id });
  return getOrSet(cacheKey, env.CACHE_TTL_PLAYERS_SECONDS, () => fetchElementSummary(id));
}

export async function getBootstrapDataset() {
  const bootstrap = await getBootstrap();
  return {
    ...bootstrap,
    teams: bootstrap.teams.map(enrichTeam),
  };
}
