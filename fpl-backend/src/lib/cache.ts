import { createHash } from 'crypto';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { getLiveScoresGateway } from '../sockets/liveScores.gateway';

const CACHE_OPERATION_TIMEOUT_MS = 1_500;

function withCacheTimeout<T>(operation: Promise<T>): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Cache operation timed out')), CACHE_OPERATION_TIMEOUT_MS);
      timer.unref?.();
    }),
  ]);
}

export const CACHE_PREFIX = {
  players: 'players:list',
  fixtures: 'fixtures:list',
  standings: 'standings',
  fplBootstrap: 'fpl:bootstrap',
  fplFixtures: 'fpl:fixtures',
  fplPlayerSummary: 'fpl:player-summary',
} as const;

function isCacheEnabled(): boolean {
  return env.CACHE_ENABLED;
}

export function buildCacheKey(namespace: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const value = params[key];
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {});

  const hash = createHash('sha256').update(JSON.stringify(sorted)).digest('hex').slice(0, 16);
  return `${namespace}:${hash}`;
}

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!isCacheEnabled()) {
    return fetcher();
  }

  try {
    const cached = await withCacheTimeout(redis.get(key));
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch {
    return fetcher();
  }

  const value = await fetcher();

  try {
    await withCacheTimeout(redis.setex(key, ttlSeconds, JSON.stringify(value)));
  } catch {
    // Cache write failure should not break the request
  }

  return value;
}

export async function invalidate(keys: string[]): Promise<void> {
  if (!isCacheEnabled() || keys.length === 0) {
    return;
  }

  try {
    await redis.del(...keys);
  } catch {
    // Ignore invalidation errors
  }
}

export async function invalidateByPrefix(prefix: string): Promise<void> {
  if (!isCacheEnabled()) {
    return;
  }

  const pattern = `${prefix}:*`;
  let cursor = '0';

  try {
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // Ignore invalidation errors
  }
}

function emitStandingsUpdated(leagueIds: string[]): void {
  const gateway = getLiveScoresGateway();
  if (!gateway) {
    return;
  }

  for (const leagueId of leagueIds) {
    gateway.emitStandingsUpdated({ leagueId });
  }
}

export async function invalidateStandingsForLeague(leagueId: string): Promise<void> {
  await invalidateByPrefix(`${CACHE_PREFIX.standings}:${leagueId}`);
  emitStandingsUpdated([leagueId]);
}

export async function invalidateStandingsForTeam(teamId: string): Promise<void> {
  const memberships = await prisma.leagueMembership.findMany({
    where: { teamId },
    select: { leagueId: true },
  });

  const leagueIds = [...new Set(memberships.map((m) => m.leagueId))];
  if (leagueIds.length === 0) {
    return;
  }

  await Promise.all(
    leagueIds.map((leagueId) => invalidateByPrefix(`${CACHE_PREFIX.standings}:${leagueId}`)),
  );
  emitStandingsUpdated(leagueIds);
}

export async function invalidateAllStandingsWithBroadcast(): Promise<void> {
  await invalidateByPrefix(CACHE_PREFIX.standings);

  const leagues = await prisma.league.findMany({ select: { id: true } });
  emitStandingsUpdated(leagues.map((league) => league.id));
}
