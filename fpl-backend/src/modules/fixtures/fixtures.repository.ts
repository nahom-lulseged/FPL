import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import type { ListFixturesQuery } from './fixtures.validation';

const fixtureSelect = {
  id: true,
  fplId: true,
  kickoffTime: true,
  homeScore: true,
  awayScore: true,
  homeDifficulty: true,
  awayDifficulty: true,
  started: true,
  minutes: true,
  finished: true,
  gameweek: {
    select: {
      id: true,
      number: true,
      deadline: true,
      status: true,
    },
  },
  homeTeam: {
    select: {
      id: true,
      name: true,
      shortName: true,
      crestUrl: true,
    },
  },
  awayTeam: {
    select: {
      id: true,
      name: true,
      shortName: true,
      crestUrl: true,
    },
  },
} satisfies Prisma.FixtureSelect;

export type FixtureListItem = Prisma.FixtureGetPayload<{
  select: typeof fixtureSelect;
}>;

export function buildFixtureWhere(query: ListFixturesQuery): Prisma.FixtureWhereInput {
  const where: Prisma.FixtureWhereInput = {};

  if (query.gameweek !== undefined) {
    where.gameweek = { number: query.gameweek };
  }
  if (query.teamId) {
    where.OR = [{ homeTeamId: query.teamId }, { awayTeamId: query.teamId }];
  }
  if (query.isPostponed !== undefined) {
    where.isPostponed = query.isPostponed;
  }

  return where;
}

export async function findFixtures(
  query: ListFixturesQuery,
): Promise<{ data: FixtureListItem[]; total: number }> {
  const where = buildFixtureWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [data, total] = await Promise.all([
    prisma.fixture.findMany({
      where,
      select: fixtureSelect,
      orderBy: { kickoffTime: 'asc' },
      skip,
      take: query.limit,
    }),
    prisma.fixture.count({ where }),
  ]);

  return { data, total };
}

export async function findFixtureById(id: string) {
  return prisma.fixture.findUnique({ where: { id }, select: fixtureSelect });
}
