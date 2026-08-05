import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/db';
import { invalidateStandingsForLeague } from '../../../lib/cache';
import { AppError } from '../../../middleware/errorHandler';
import { computeLeagueStandings } from '../../leagues/leagues.service';
import { logAdminAction } from '../audit/auditLog.service';
import type {
  AdminLeagueCreator,
  AdminLeagueDetail,
  AdminLeagueListRow,
  AdminLeagueMember,
  AdminLeagueStandingRow,
} from './adminLeagues.types';
import type { ConfirmActionBody, ListLeaguesQuery } from './adminLeagues.validation';

async function resolveCreators(adminUserIds: string[]): Promise<Map<string, AdminLeagueCreator>> {
  const uniqueIds = [...new Set(adminUserIds)];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, email: true, displayName: true },
  });

  return new Map(
    users.map((user) => [
      user.id,
      { id: user.id, email: user.email, displayName: user.displayName },
    ]),
  );
}


async function buildListWhereWithSearch(query: ListLeaguesQuery): Promise<Prisma.LeagueWhereInput> {
  if (!query.search) {
    return {
      ...(query.type ? { type: query.type } : {}),
    };
  }

  const searchLower = query.search.toLowerCase();

  const creatorMatches = await prisma.user.findMany({
    where: { email: { contains: searchLower } },
    select: { id: true },
  });

  const creatorIds = creatorMatches.map((u) => u.id);

  return {
    ...(query.type ? { type: query.type } : {}),
    OR: [
      { nameLower: { contains: searchLower } },
      ...(creatorIds.length > 0 ? [{ adminUserId: { in: creatorIds } }] : []),
    ],
  };
}

function buildListOrderBy(
  query: ListLeaguesQuery,
): Prisma.LeagueOrderByWithRelationInput {
  if (query.sortBy === 'memberCount') {
    return { memberships: { _count: query.sortDir } };
  }

  return { [query.sortBy]: query.sortDir };
}

function formatMember(membership: {
  id: string;
  userId: string;
  teamId: string;
  joinedAt: Date;
  user: { email: string | null; displayName: string };
  team: { name: string };
}): AdminLeagueMember {
  return {
    id: membership.id,
    userId: membership.userId,
    email: membership.user.email,
    displayName: membership.user.displayName,
    teamId: membership.teamId,
    teamName: membership.team.name,
    joinedAt: membership.joinedAt.toISOString(),
  };
}

function formatStandings(
  standings: Awaited<ReturnType<typeof computeLeagueStandings>>['standings'],
): AdminLeagueStandingRow[] {
  return standings.map((row) => ({
    rank: row.rank,
    userId: row.userId,
    teamId: row.teamId,
    teamName: row.teamName,
    managerName: row.managerName,
    totalPoints: row.totalPoints,
    gameweekPoints: row.gameweekPoints,
    chipsUsed: row.chipsUsed,
  }));
}

export async function listLeagues(query: ListLeaguesQuery) {
  const where = await buildListWhereWithSearch(query);
  const skip = (query.page - 1) * query.limit;

  const [rows, total] = await Promise.all([
    prisma.league.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        season: true,
        inviteCode: true,
        adminUserId: true,
        createdAt: true,
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: buildListOrderBy(query),
      skip,
      take: query.limit,
    }),
    prisma.league.count({ where }),
  ]);

  const creators = await resolveCreators(rows.map((row) => row.adminUserId));

  const data: AdminLeagueListRow[] = rows.map((row) => {
    const creator = creators.get(row.adminUserId) ?? {
      id: row.adminUserId,
      email: 'unknown',
      displayName: 'Unknown',
    };

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      memberCount: row._count.memberships,
      creator,
      season: row.season,
      inviteCode: row.inviteCode,
      createdAt: row.createdAt.toISOString(),
    };
  });

  const totalPages = Math.ceil(total / query.limit) || 1;

  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}

export async function getLeagueDetail(leagueId: string): Promise<AdminLeagueDetail | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      _count: { select: { memberships: true } },
    },
  });

  if (!league) {
    return null;
  }

  const [creatorUser, memberships, standingsResult] = await Promise.all([
    prisma.user.findUnique({
      where: { id: league.adminUserId },
      select: { id: true, email: true, displayName: true },
    }),
    prisma.leagueMembership.findMany({
      where: { leagueId },
      include: {
        user: {
          select: { id: true, email: true, displayName: true },
        },
        team: {
          select: { id: true, name: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    }),
    computeLeagueStandings(leagueId),
  ]);

  const creator: AdminLeagueCreator = creatorUser ?? {
    id: league.adminUserId,
    email: 'unknown',
    displayName: 'Unknown',
  };

  return {
    id: league.id,
    name: league.name,
    type: league.type,
    season: league.season,
    inviteCode: league.inviteCode,
    memberCount: league._count.memberships,
    createdAt: league.createdAt.toISOString(),
    updatedAt: league.updatedAt.toISOString(),
    creator,
    members: memberships.map((m) => formatMember(m)),
    standings: formatStandings(standingsResult.standings),
    currentGameweek: standingsResult.currentGameweek,
  };
}

export async function removeLeagueMember(
  leagueId: string,
  userId: string,
  adminId: string,
  body: ConfirmActionBody,
) {
  if (!body.confirm) {
    throw new AppError(400, 'Confirmation required');
  }

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) {
    throw new AppError(404, 'League not found');
  }

  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
    include: {
      user: { select: { id: true, email: true, displayName: true } },
      team: { select: { id: true, name: true } },
    },
  });

  if (!membership) {
    throw new AppError(404, 'Member not found in this league');
  }

  const beforeMember = formatMember(membership);

  await prisma.$transaction(async (tx) => {
    await tx.leagueMembership.delete({
      where: { leagueId_userId: { leagueId, userId } },
    });

    await logAdminAction({
      tx,
      adminId,
      action: 'LEAGUE_MEMBER_REMOVE',
      targetType: 'League',
      targetId: leagueId,
      before: {
        member: beforeMember,
        league: { id: league.id, name: league.name },
      },
      after: { removedUserId: userId },
    });
  });

  await invalidateStandingsForLeague(leagueId);

  const standingsResult = await computeLeagueStandings(leagueId);

  return {
    removed: true,
    leagueId,
    userId,
    standings: formatStandings(standingsResult.standings),
    currentGameweek: standingsResult.currentGameweek,
  };
}

export async function dissolveLeague(
  leagueId: string,
  adminId: string,
  body: ConfirmActionBody,
) {
  if (!body.confirm) {
    throw new AppError(400, 'Confirmation required');
  }

  let league;
  try {
    league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        _count: { select: { memberships: true } },
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2023'
    ) {
      throw new AppError(404, 'League not found');
    }
    throw err;
  }

  if (!league) {
    throw new AppError(404, 'League not found');
  }

  const beforeJson = {
    id: league.id,
    name: league.name,
    type: league.type,
    season: league.season,
    inviteCode: league.inviteCode,
    adminUserId: league.adminUserId,
    memberCount: league._count.memberships,
    createdAt: league.createdAt.toISOString(),
  };

  await prisma.$transaction(async (tx) => {
    await logAdminAction({
      tx,
      adminId,
      action: 'LEAGUE_DISSOLVE',
      targetType: 'League',
      targetId: leagueId,
      before: beforeJson,
      after: { dissolved: true },
    });

    await tx.league.delete({ where: { id: leagueId } });
  });

  await invalidateStandingsForLeague(leagueId);

  return { dissolved: true, leagueId };
}
