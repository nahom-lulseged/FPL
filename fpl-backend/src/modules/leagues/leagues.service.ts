import { AppError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import { DEFAULT_PAYOUT_SPLIT, platformConfig } from '../../config/platformConfig';
import {
  buildCacheKey,
  CACHE_PREFIX,
  getOrSet,
  invalidateStandingsForLeague,
} from '../../lib/cache';
import { buildMeta, paginateArray } from '../../lib/pagination';
import { LEDGER_TX_OPTIONS, retryTransaction } from '../../lib/retryTransaction';
import * as teamsRepository from '../teams/teams.repository';
import {
  assertPotLimit,
  commitStakeHold,
  validateStakeAmount,
} from '../staked-leagues/stakeCommitment.service';
import { getOrCreateUserWallet } from '../wallet/wallet.service';
import { assertLeagueMember } from './leagueGuards';
import { assertStakeCompliance } from './stakeCompliance';
import {
  canCreateLeagueType,
  generateInviteCode,
  joinErrorMessage,
  type ClassicStandingInput,
} from './leagues.rules';
import * as leaguesRepository from './leagues.repository';
import { rankClassicStandings } from './standings.calculator';
import type { CreateLeagueInput, JoinLeagueInput, ListLeaguesQuery, StandingsQuery } from './leagues.validation';

const MAX_INVITE_CODE_ATTEMPTS = 5;

function formatLeagueSummary(
  league: {
    id: string;
    name: string;
    type: string;
    inviteCode: string;
    adminUserId: string;
    season: string;
    stakeAmountMinor?: number | null;
    isPrivate?: boolean;
    potTotalMinor?: number;
    payoutStatus?: string;
    payoutSplitConfig?: unknown;
    createdAt: Date;
    updatedAt: Date;
    _count: { memberships: number };
  },
  userId: string,
  options?: { hideInviteCode?: boolean },
) {
  const isMember = league._count.memberships > 0;
  const showInviteCode =
    !options?.hideInviteCode &&
    (league.adminUserId === userId || league.isPrivate !== true || isMember);

  return {
    id: league.id,
    name: league.name,
    type: league.type,
    inviteCode: showInviteCode ? league.inviteCode : undefined,
    adminUserId: league.adminUserId,
    season: league.season,
    stakeAmountMinor: league.stakeAmountMinor ?? null,
    isPrivate: league.isPrivate ?? false,
    potTotalMinor: league.potTotalMinor ?? 0,
    payoutStatus: league.payoutStatus ?? 'OPEN',
    payoutSplitConfig: league.payoutSplitConfig ?? null,
    memberCount: league._count.memberships,
    isAdmin: league.adminUserId === userId,
    isStaked: league.stakeAmountMinor != null && league.stakeAmountMinor > 0,
    createdAt: league.createdAt.toISOString(),
    updatedAt: league.updatedAt.toISOString(),
  };
}

async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt += 1) {
    const inviteCode = generateInviteCode();
    const exists = await leaguesRepository.inviteCodeExists(inviteCode);
    if (!exists) {
      return inviteCode;
    }
  }
  throw new AppError(500, 'Failed to generate invite code');
}

export async function createLeague(userId: string, input: CreateLeagueInput) {
  if (!canCreateLeagueType(input.type)) {
    throw new AppError(400, 'Head-to-head leagues are not supported yet');
  }

  if (input.stakeAmountMinor) {
    throw new AppError(403, 'Paid weekly leagues can only be published by the platform');
  }

  const team = await teamsRepository.findTeamByUserAndSeason(userId, input.season);
  if (!team) {
    throw new AppError(404, 'No team found for this season');
  }

  if (input.stakeAmountMinor) {
    validateStakeAmount(input.stakeAmountMinor);
    await assertStakeCompliance(userId);
  }

  const inviteCode = await generateUniqueInviteCode();

  const payoutSplitConfig = input.stakeAmountMinor
    ? {
        ranks: input.payoutSplitConfig?.ranks ?? DEFAULT_PAYOUT_SPLIT.ranks,
        platformPercentBps:
          input.payoutSplitConfig?.platformPercentBps ??
          platformConfig.platformCommissionBps,
        termsVersion:
          input.payoutSplitConfig?.termsVersion ?? platformConfig.termsVersion,
      }
    : undefined;

  const { prisma } = await import('../../config/db');

  // Prefetch user wallet outside the interactive tx when staking (escrow needs leagueId).
  if (input.stakeAmountMinor) {
    await getOrCreateUserWallet(userId);
  }

  const { league, membership } = await retryTransaction(() =>
    prisma.$transaction(async (tx) => {
      const result = await leaguesRepository.createLeagueWithAdminMembershipInTx(tx, {
        name: input.name,
        type: input.type,
        season: input.season,
        adminUserId: userId,
        teamId: team.id,
        inviteCode,
        stakeAmountMinor: input.stakeAmountMinor ?? null,
        isPrivate: input.isPrivate ?? false,
        payoutSplitConfig,
      });

      if (input.stakeAmountMinor) {
        await assertPotLimit(tx, result.league.id, input.stakeAmountMinor);
        await commitStakeHold(tx, {
          userId,
          leagueId: result.league.id,
          stakeAmountMinor: input.stakeAmountMinor,
          referenceId: result.membership.id,
          idempotencyKey: `stake:create:${result.league.id}:${userId}`,
        });
      }

      return result;
    }, LEDGER_TX_OPTIONS),
  );

  void membership;

  const leagueWithCount = await leaguesRepository.findLeagueById(league.id);
  if (!leagueWithCount) {
    throw new AppError(500, 'Failed to load created league');
  }

  await invalidateStandingsForLeague(league.id);

  return formatLeagueSummary(leagueWithCount, userId);
}

export async function joinLeague(userId: string, input: JoinLeagueInput) {
  const league = await leaguesRepository.findLeagueByInviteCode(input.inviteCode);
  if (!league) {
    throw new AppError(404, joinErrorMessage('LEAGUE_NOT_FOUND'));
  }

  const team = await teamsRepository.findTeamByUserAndSeason(userId, league.season);
  if (!team) {
    throw new AppError(404, joinErrorMessage('NO_TEAM_FOR_SEASON'));
  }

  const existingMembership = await leaguesRepository.findMembership(league.id, userId);
  if (existingMembership) {
    throw new AppError(409, joinErrorMessage('ALREADY_MEMBER'));
  }

  const teamMembership = await leaguesRepository.findMembershipByTeam(league.id, team.id);
  if (teamMembership) {
    throw new AppError(409, joinErrorMessage('TEAM_ALREADY_IN_LEAGUE'));
  }

  let membership;

  if (league.stakeAmountMinor) {
    validateStakeAmount(league.stakeAmountMinor);
    await assertStakeCompliance(userId);
    await getOrCreateUserWallet(userId);

    membership = await leaguesRepository.createMembershipWithStake(
      { leagueId: league.id, userId, teamId: team.id },
      async (tx, membershipId) => {
        await assertPotLimit(tx, league.id, league.stakeAmountMinor!);
        await commitStakeHold(tx, {
          userId,
          leagueId: league.id,
          stakeAmountMinor: league.stakeAmountMinor!,
          referenceId: membershipId,
          idempotencyKey: `stake:join:${league.id}:${userId}`,
        });
      },
    );
  } else {
    membership = await leaguesRepository.createMembership({
      leagueId: league.id,
      userId,
      teamId: team.id,
    });
  }

  const leagueWithCount = await leaguesRepository.findLeagueById(league.id);
  if (!leagueWithCount) {
    throw new AppError(500, 'Failed to load league');
  }

  await invalidateStandingsForLeague(league.id);

  return {
    ...formatLeagueSummary(leagueWithCount, userId),
    joinedAt: membership.joinedAt.toISOString(),
  };
}

export async function listMyLeagues(userId: string, query: ListLeaguesQuery) {
  const { data: memberships, total } = await leaguesRepository.listLeaguesForUser(userId, {
    season: query.season,
    page: query.page,
    limit: query.limit,
  });

  return {
    data: memberships.map((membership) => ({
      ...formatLeagueSummary(membership.league, userId),
      joinedAt: membership.joinedAt.toISOString(),
    })),
    meta: buildMeta(query.page, query.limit, total),
  };
}

export async function getLeague(userId: string, leagueId: string) {
  await assertLeagueMember(userId, leagueId);

  const league = await leaguesRepository.findLeagueById(leagueId);
  if (!league) {
    throw new AppError(404, 'League not found');
  }

  return formatLeagueSummary(league, userId);
}

export async function computeLeagueStandings(leagueId: string) {
  const league = await leaguesRepository.findLeagueById(leagueId);
  if (!league) {
    throw new AppError(404, 'League not found');
  }

  const currentGameweek = await teamsRepository.findCurrentGameweek();
  const members = await leaguesRepository.findMembersWithTeams(leagueId);
  const teamIds = members.map((member) => member.teamId);

  const gameweekScores =
    currentGameweek !== null
      ? await leaguesRepository.findTeamGameweekScoresForTeams(teamIds, currentGameweek.id)
      : [];

  const scoresByTeamId = new Map(
    gameweekScores.map((score) => [score.teamId, score.totalPoints]),
  );

  const chipRows = await leaguesRepository.findChipUsagesForTeams(teamIds, league.season);
  const chipsByTeamId = new Map<string, Array<{ chipType: string; gameweekNumber: number }>>();

  for (const chip of chipRows) {
    const existing = chipsByTeamId.get(chip.teamId) ?? [];
    existing.push({
      chipType: chip.chipType,
      gameweekNumber: chip.gameweekNumber,
    });
    chipsByTeamId.set(chip.teamId, existing);
  }

  const standingInputs: ClassicStandingInput[] = members.map((member) => ({
    userId: member.userId,
    teamId: member.teamId,
    teamName: member.team.name,
    managerName: member.user.displayName,
    totalPoints: member.team.totalPoints,
    gameweekPoints: scoresByTeamId.get(member.teamId) ?? null,
    chipsUsed: chipsByTeamId.get(member.teamId) ?? [],
  }));

  const standings = rankClassicStandings(standingInputs);

  return {
    leagueId: league.id,
    type: league.type,
    currentGameweek: currentGameweek?.number ?? null,
    standings,
  };
}

export async function getStandings(userId: string, leagueId: string, query: StandingsQuery) {
  await assertLeagueMember(userId, leagueId);

  const currentGameweek = await teamsRepository.findCurrentGameweek();
  const isLiveGameweek = currentGameweek !== null && currentGameweek.status === 'LIVE';
  const ttl = isLiveGameweek
    ? env.CACHE_TTL_STANDINGS_LIVE_SECONDS
    : env.CACHE_TTL_STANDINGS_SECONDS;

  const cacheKey = buildCacheKey(`${CACHE_PREFIX.standings}:${leagueId}`, query);

  return getOrSet(cacheKey, ttl, async () => {
    const { leagueId: id, type, currentGameweek: gw, standings } =
      await computeLeagueStandings(leagueId);

    return {
      leagueId: id,
      type,
      currentGameweek: gw,
      data: paginateArray(standings, query.page, query.limit),
      meta: buildMeta(query.page, query.limit, standings.length),
    };
  });
}
