import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import type { ListPlayersQuery, PlayerSortField } from './players.validation';

const playerSelect = {
  id: true,
  fplId: true,
  name: true,
  position: true,
  price: true,
  isAvailable: true,
  availabilityStatus: true,
  chanceOfPlayingNextRound: true,
  totalPoints: true,
  eventPoints: true,
  selectedByPercent: true,
  minutes: true,
  goalsScored: true,
  assists: true,
  cleanSheets: true,
  goalsConceded: true,
  ownGoals: true,
  penaltiesSaved: true,
  injuryNote: true,
  elementSummarySyncedAt: true,
  realTeam: {
    select: {
      id: true,
      name: true,
      shortName: true,
      crestUrl: true,
    },
  },
} satisfies Prisma.PlayerSelect;

export type PlayerListItem = Prisma.PlayerGetPayload<{
  select: typeof playerSelect;
}>;

export interface PriceBounds {
  min: number;
  max: number;
  q1: number;
  q2: number;
  q3: number;
}

export function buildPlayerWhere(query: ListPlayersQuery): Prisma.PlayerWhereInput {
  const where: Prisma.PlayerWhereInput = {};

  if (query.position) {
    where.position = query.position;
  }
  if (query.teamId) {
    where.realTeamId = query.teamId;
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {};
    if (query.minPrice !== undefined) {
      where.price.gte = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      where.price.lte = query.maxPrice;
    }
  }
  if (query.search) {
    where.nameLower = { contains: query.search.toLowerCase() };
  }
  if (query.ids && query.ids.length > 0) {
    where.id = { in: query.ids };
  }

  return where;
}

export function buildPriceBoundsWhere(query: ListPlayersQuery): Prisma.PlayerWhereInput {
  const where = buildPlayerWhere(query);
  delete (where as { price?: unknown }).price;
  return where;
}

function buildOrderBy(query: ListPlayersQuery): Prisma.PlayerOrderByWithRelationInput[] {
  const field = query.sortBy as PlayerSortField;
  const direction = query.sortDir;
  return [{ [field]: direction }, { name: 'asc' }];
}

function computeQuartiles(sortedPrices: number[]): Pick<PriceBounds, 'q1' | 'q2' | 'q3'> {
  if (sortedPrices.length === 0) {
    return { q1: 0, q2: 0, q3: 0 };
  }

  const at = (fraction: number) => {
    const index = Math.floor((sortedPrices.length - 1) * fraction);
    return sortedPrices[index] ?? sortedPrices[sortedPrices.length - 1]!;
  };

  return {
    q1: at(0.25),
    q2: at(0.5),
    q3: at(0.75),
  };
}

export async function findPriceBounds(query: ListPlayersQuery): Promise<PriceBounds> {
  const where = buildPriceBoundsWhere(query);
  const prices = await prisma.player.findMany({
    where,
    select: { price: true },
    orderBy: { price: 'asc' },
  });

  const sorted = prices.map((p) => p.price);
  if (sorted.length === 0) {
    return { min: 0, max: 0, q1: 0, q2: 0, q3: 0 };
  }

  const quartiles = computeQuartiles(sorted);
  return {
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    ...quartiles,
  };
}

export async function findPlayers(
  query: ListPlayersQuery,
): Promise<{ data: PlayerListItem[]; total: number; priceBounds: PriceBounds }> {
  const where = buildPlayerWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [data, total, priceBounds] = await Promise.all([
    prisma.player.findMany({
      where,
      select: playerSelect,
      orderBy: buildOrderBy(query),
      skip,
      take: query.limit,
    }),
    prisma.player.count({ where }),
    findPriceBounds(query),
  ]);

  return { data, total, priceBounds };
}

export async function findPlayerById(id: string): Promise<PlayerListItem | null> {
  return prisma.player.findUnique({
    where: { id },
    select: playerSelect,
  });
}
