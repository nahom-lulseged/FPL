import { prisma } from '../../config/db';
import type { LeagueType, PayoutStatus, Prisma } from '@prisma/client';
import { skipTake } from '../../lib/pagination';
import { LEDGER_TX_OPTIONS, retryTransaction } from '../../lib/retryTransaction';

export interface CreateLeagueParams {
  name: string;
  type: LeagueType;
  season: string;
  adminUserId: string;
  teamId: string;
  inviteCode: string;
  stakeAmountMinor?: number | null;
  isPrivate?: boolean;
  payoutSplitConfig?: Prisma.InputJsonValue;
}

export async function createLeagueWithAdminMembership(params: CreateLeagueParams) {
  return prisma.$transaction(async (tx) => createLeagueWithAdminMembershipInTx(tx, params));
}

export async function createLeagueWithAdminMembershipInTx(
  tx: Prisma.TransactionClient,
  params: CreateLeagueParams,
) {
  const league = await tx.league.create({
    data: {
      name: params.name,
      nameLower: params.name.toLowerCase(),
      type: params.type,
      season: params.season,
      adminUserId: params.adminUserId,
      inviteCode: params.inviteCode.toUpperCase(),
      stakeAmountMinor: params.stakeAmountMinor ?? null,
      isPrivate: params.isPrivate ?? false,
      payoutSplitConfig: params.payoutSplitConfig ?? undefined,
      potTotalMinor: 0,
    },
  });

  const membership = await tx.leagueMembership.create({
    data: {
      leagueId: league.id,
      userId: params.adminUserId,
      teamId: params.teamId,
    },
  });

  return { league, membership };
}

export async function createMembershipWithStake(
  params: {
    leagueId: string;
    userId: string;
    teamId: string;
  },
  stakeFn: (
    tx: Prisma.TransactionClient,
    membershipId: string,
  ) => Promise<void>,
) {
  return retryTransaction(() =>
    prisma.$transaction(async (tx) => {
      const league = await tx.league.findUnique({ where: { id: params.leagueId } });
      if (!league) {
        throw new Error('League not found');
      }

      const membership = await tx.leagueMembership.create({
        data: params,
      });

      await stakeFn(tx, membership.id);

      return membership;
    }, LEDGER_TX_OPTIONS),
  );
}

export async function findLeagueById(id: string) {
  return prisma.league.findUnique({
    where: { id },
    include: {
      _count: {
        select: { memberships: true },
      },
    },
  });
}

export async function findLeagueByInviteCode(code: string) {
  return prisma.league.findUnique({
    where: { inviteCode: code.toUpperCase() },
  });
}

export async function findMembership(leagueId: string, userId: string) {
  return prisma.leagueMembership.findUnique({
    where: {
      leagueId_userId: { leagueId, userId },
    },
  });
}

export async function findMembershipByTeam(leagueId: string, teamId: string) {
  return prisma.leagueMembership.findUnique({
    where: {
      leagueId_teamId: { leagueId, teamId },
    },
  });
}

export async function listLeaguesForUser(
  userId: string,
  options: { season?: string; page: number; limit: number },
) {
  const where = {
    userId,
    ...(options.season ? { league: { season: options.season } } : {}),
  };
  const { skip, take } = skipTake(options.page, options.limit);

  const [data, total] = await Promise.all([
    prisma.leagueMembership.findMany({
      where,
      include: {
        league: {
          include: {
            _count: {
              select: { memberships: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      skip,
      take,
    }),
    prisma.leagueMembership.count({ where }),
  ]);

  return { data, total };
}

export async function createMembership(params: {
  leagueId: string;
  userId: string;
  teamId: string;
}) {
  return prisma.leagueMembership.create({
    data: params,
  });
}

export async function findMembersWithTeams(leagueId: string) {
  return prisma.leagueMembership.findMany({
    where: { leagueId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          totalPoints: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });
}

export async function findTeamGameweekScoresForTeams(
  teamIds: string[],
  gameweekId: string,
) {
  if (teamIds.length === 0) {
    return [];
  }

  return prisma.teamGameweekScore.findMany({
    where: {
      teamId: { in: teamIds },
      gameweekId,
    },
    select: {
      teamId: true,
      totalPoints: true,
    },
  });
}

export async function findChipUsagesForTeams(teamIds: string[], season: string) {
  if (teamIds.length === 0) {
    return [];
  }

  return prisma.chipUsage.findMany({
    where: {
      teamId: { in: teamIds },
      season,
    },
    select: {
      teamId: true,
      chipType: true,
      gameweekNumber: true,
    },
    orderBy: { usedAt: 'asc' },
  });
}

export async function inviteCodeExists(inviteCode: string): Promise<boolean> {
  const existing = await prisma.league.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
    select: { id: true },
  });
  return existing !== null;
}
