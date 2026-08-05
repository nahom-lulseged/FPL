import { env } from '../../config/env';
import { buildCacheKey, CACHE_PREFIX, getOrSet } from '../../lib/cache';
import * as fixturesRepository from './fixtures.repository';
import type { ListFixturesQuery } from './fixtures.validation';
import { AppError } from '../../middleware/errorHandler';
import { getLiveMatchProvider } from './liveMatchProvider';

function enrichWithFdr(
  fixture: fixturesRepository.FixtureListItem,
  teamId?: string,
) {
  let fdrForTeam: number | undefined;
  if (teamId) {
    if (fixture.homeTeam.id === teamId) {
      fdrForTeam = fixture.homeDifficulty ?? undefined;
    } else if (fixture.awayTeam.id === teamId) {
      fdrForTeam = fixture.awayDifficulty ?? undefined;
    }
  }

  return {
    ...fixture,
    ...(fdrForTeam !== undefined ? { fdrForTeam } : {}),
  };
}

export async function listFixtures(query: ListFixturesQuery) {
  const cacheKey = buildCacheKey(CACHE_PREFIX.fixtures, query);

  return getOrSet(cacheKey, env.CACHE_TTL_FIXTURES_SECONDS, async () => {
    const { data, total } = await fixturesRepository.findFixtures(query);
    const totalPages = Math.ceil(total / query.limit) || 1;

    return {
      data: data.map((f) => enrichWithFdr(f, query.teamId)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  });
}

export async function getMatchCenterFixture(id: string) {
  const fixture = await fixturesRepository.findFixtureById(id);
  if (!fixture) throw new AppError(404, 'Fixture not found');
  const advanced = await getLiveMatchProvider().getAdvancedData(id);
  return { ...fixture, advanced: advanced.data, completeness: advanced.completeness };
}
