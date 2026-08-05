import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { buildMeta, skipTake } from '../../lib/pagination';
import * as leaguesService from '../leagues/leagues.service';

export async function joinPublicStakedLeague(userId: string, leagueId: string) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });

  if (!league) {
    throw new AppError(404, 'League not found');
  }

  if (league.isPrivate || !league.stakeAmountMinor) {
    throw new AppError(400, 'League is not joinable via public browser');
  }

  return leaguesService.joinLeague(userId, { inviteCode: league.inviteCode });
}

export async function listPublicStakedLeagues(options: {
  page: number;
  limit: number;
  season?: string;
}) {
  const where = {
    isPrivate: false,
    stakeAmountMinor: { not: null },
    ...(options.season ? { season: options.season } : {}),
  };

  const [leagues, total] = await Promise.all([
    prisma.league.findMany({
      where,
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: 'desc' },
      ...skipTake(options.page, options.limit),
    }),
    prisma.league.count({ where }),
  ]);

  return {
    data: leagues.map((league) => ({
      id: league.id,
      name: league.name,
      type: league.type,
      season: league.season,
      stakeAmountMinor: league.stakeAmountMinor,
      potTotalMinor: league.potTotalMinor,
      memberCount: league._count.memberships,
      payoutStatus: league.payoutStatus,
      payoutSplitConfig: league.payoutSplitConfig,
      createdAt: league.createdAt.toISOString(),
      // No invite code for public browser
    })),
    meta: buildMeta(options.page, options.limit, total),
  };
}

export async function listStakedLeaguesAdmin(options: {
  page: number;
  limit: number;
  payoutStatus?: string;
}) {
  const where = {
    stakeAmountMinor: { not: null },
    ...(options.payoutStatus ? { payoutStatus: options.payoutStatus as 'OPEN' | 'LOCKED' | 'DISTRIBUTED' } : {}),
  };

  const [leagues, total] = await Promise.all([
    prisma.league.findMany({
      where,
      include: { _count: { select: { memberships: true } } },
      orderBy: { potTotalMinor: 'desc' },
      ...skipTake(options.page, options.limit),
    }),
    prisma.league.count({ where }),
  ]);

  return {
    data: leagues.map((l) => ({
      id: l.id,
      name: l.name,
      stakeAmountMinor: l.stakeAmountMinor,
      potTotalMinor: l.potTotalMinor,
      payoutStatus: l.payoutStatus,
      memberCount: l._count.memberships,
      isPrivate: l.isPrivate,
      season: l.season,
    })),
    meta: buildMeta(options.page, options.limit, total),
  };
}
