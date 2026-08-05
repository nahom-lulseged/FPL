import { ChipType } from '@prisma/client';
import { prisma } from '../../../config/db';
import { env } from '../../../config/env';
import { buildCacheKey, getOrSet } from '../../../lib/cache';
import { AppError } from '../../../middleware/errorHandler';
import type {
  ChipUsageResponse,
  GrowthResponse,
  TransferTrendsResponse,
} from './analytics.types';
import type { GrowthQuery, TransfersQuery } from './analytics.validation';

const ALL_CHIP_TYPES: ChipType[] = [
  ChipType.WILDCARD,
  ChipType.FREE_HIT,
  ChipType.BENCH_BOOST,
  ChipType.TRIPLE_CAPTAIN,
];

async function resolveGameweek(gameweekNumber?: number) {
  if (gameweekNumber !== undefined) {
    const gameweek = await prisma.gameweek.findUnique({
      where: { number: gameweekNumber },
      select: { id: true, number: true },
    });
    if (!gameweek) {
      throw new AppError(404, 'Gameweek not found');
    }
    return gameweek;
  }

  const current = await prisma.gameweek.findFirst({
    where: { isCurrent: true },
    select: { id: true, number: true },
  });
  if (!current) {
    throw new AppError(404, 'No current gameweek found');
  }
  return current;
}

async function mapPlayerCounts(
  rows: Array<{ playerId: string; count: number }>,
): Promise<Array<{ playerId: string; playerName: string; count: number }>> {
  if (rows.length === 0) {
    return [];
  }

  const players = await prisma.player.findMany({
    where: { id: { in: rows.map((row) => row.playerId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(players.map((player) => [player.id, player.name]));

  return rows.map((row) => ({
    playerId: row.playerId,
    playerName: nameById.get(row.playerId) ?? 'Unknown',
    count: row.count,
  }));
}

export async function getTransferTrends(
  query: TransfersQuery,
): Promise<TransferTrendsResponse> {
  const gameweek = await resolveGameweek(query.gameweek);

  const [transferredInGroups, transferredOutGroups] = await Promise.all([
    prisma.transfer.groupBy({
      by: ['playerInId'],
      where: { gameweekId: gameweek.id },
      _count: { _all: true },
    }),
    prisma.transfer.groupBy({
      by: ['playerOutId'],
      where: { gameweekId: gameweek.id },
      _count: { _all: true },
    }),
  ]);

  const sortByCountDesc = <T extends { count: number }>(rows: T[]) =>
    [...rows].sort((a, b) => b.count - a.count).slice(0, 10);

  const [transferredIn, transferredOut] = await Promise.all([
    mapPlayerCounts(
      sortByCountDesc(
        transferredInGroups.map((row) => ({
          playerId: row.playerInId,
          count: row._count._all,
        })),
      ),
    ),
    mapPlayerCounts(
      sortByCountDesc(
        transferredOutGroups.map((row) => ({
          playerId: row.playerOutId,
          count: row._count._all,
        })),
      ),
    ),
  ]);

  return {
    gameweek: { id: gameweek.id, number: gameweek.number },
    transferredIn,
    transferredOut,
  };
}

export async function getChipUsage(): Promise<ChipUsageResponse> {
  const [byTypeGroups, byGameweekGroups] = await Promise.all([
    prisma.chipUsage.groupBy({
      by: ['chipType'],
      _count: { _all: true },
    }),
    prisma.chipUsage.groupBy({
      by: ['chipType', 'gameweekNumber'],
      _count: { _all: true },
      orderBy: [{ gameweekNumber: 'asc' }, { chipType: 'asc' }],
    }),
  ]);

  const byType = ALL_CHIP_TYPES.reduce<Record<ChipType, number>>(
    (acc, chipType) => {
      acc[chipType] = 0;
      return acc;
    },
    {} as Record<ChipType, number>,
  );

  for (const row of byTypeGroups) {
    byType[row.chipType] = row._count._all;
  }

  return {
    byType,
    byGameweek: byGameweekGroups.map((row) => ({
      chipType: row.chipType,
      gameweekNumber: row.gameweekNumber,
      count: row._count._all,
    })),
  };
}

function truncateDate(date: Date, granularity: 'day' | 'week'): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  if (granularity === 'week') {
    const day = result.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setUTCDate(result.getUTCDate() + diff);
  }
  return result;
}

function addPeriod(date: Date, granularity: 'day' | 'week'): Date {
  const next = new Date(date);
  if (granularity === 'week') {
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

function buildBucketKeys(from: Date, to: Date, granularity: 'day' | 'week'): string[] {
  const keys: string[] = [];
  let cursor = truncateDate(from, granularity);
  const end = truncateDate(to, granularity);

  while (cursor <= end) {
    keys.push(cursor.toISOString());
    cursor = addPeriod(cursor, granularity);
  }

  return keys;
}

function bucketTimestamps(
  timestamps: Date[],
  granularity: 'day' | 'week',
): Map<string, number> {
  const map = new Map<string, number>();
  for (const ts of timestamps) {
    const key = truncateDate(ts, granularity).toISOString();
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

async function fetchGrowthBuckets(query: GrowthQuery): Promise<GrowthResponse> {
  const from = truncateDate(query.from, query.granularity);
  const toEnd = new Date(query.to);
  toEnd.setUTCHours(23, 59, 59, 999);

  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: from, lte: toEnd } },
      select: { createdAt: true },
    }),
    prisma.team.findMany({
      where: { createdAt: { gte: from, lte: toEnd } },
      select: { createdAt: true },
    }),
  ]);

  const registrationMap = bucketTimestamps(
    users.map((u) => u.createdAt),
    query.granularity,
  );
  const teamMap = bucketTimestamps(
    teams.map((t) => t.createdAt),
    query.granularity,
  );

  const bucketKeys = buildBucketKeys(from, query.to, query.granularity);

  return {
    from: from.toISOString(),
    to: query.to.toISOString(),
    granularity: query.granularity,
    buckets: bucketKeys.map((period) => ({
      period,
      registrations: registrationMap.get(period) ?? 0,
      teamsCreated: teamMap.get(period) ?? 0,
    })),
  };
}

export async function getGrowthMetrics(query: GrowthQuery): Promise<GrowthResponse> {
  const cacheKey = buildCacheKey('admin:analytics:growth', {
    from: query.from.toISOString(),
    to: query.to.toISOString(),
    granularity: query.granularity,
  });

  return getOrSet(cacheKey, env.CACHE_TTL_ANALYTICS_GROWTH_SECONDS, () =>
    fetchGrowthBuckets(query),
  );
}
