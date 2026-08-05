import { prisma } from '../../config/db';
import { platformConfig } from '../../config/platformConfig';
import { percentOf } from '../../lib/money';
import { AppError } from '../../middleware/errorHandler';
import { computeLeagueStandings } from '../leagues/leagues.service';

export interface PayoutSplitConfig {
  ranks: Array<{ place: number; percentBps: number }>;
  platformPercentBps: number;
  termsVersion: string;
}

export interface WinnerPayout {
  userId: string;
  teamId: string;
  teamName: string;
  managerName: string;
  rank: number;
  percentBps: number;
  amountMinor: number;
}

export interface PayoutPreview {
  leagueId: string;
  leagueName: string;
  potTotalMinor: number;
  platformCommissionMinor: number;
  distributableMinor: number;
  winners: WinnerPayout[];
  payoutSplitConfig: PayoutSplitConfig;
}

function parseSplitConfig(raw: unknown): PayoutSplitConfig {
  if (!raw || typeof raw !== 'object') {
    throw new AppError(500, 'League missing payout split configuration');
  }
  return raw as PayoutSplitConfig;
}

export async function computePayoutPreview(leagueId: string): Promise<PayoutPreview> {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });

  if (!league) {
    throw new AppError(404, 'League not found');
  }

  if (!league.stakeAmountMinor) {
    throw new AppError(400, 'Not a staked league');
  }

  if (league.payoutStatus === 'DISTRIBUTED') {
    throw new AppError(400, 'Payout already distributed');
  }

  const splitConfig = parseSplitConfig(league.payoutSplitConfig);
  const { standings } = await computeLeagueStandings(leagueId);

  const platformCommissionMinor = percentOf(
    league.potTotalMinor,
    splitConfig.platformPercentBps ?? platformConfig.platformCommissionBps,
  );
  const distributableMinor = league.potTotalMinor - platformCommissionMinor;

  const winners: WinnerPayout[] = [];

  for (const rankConfig of splitConfig.ranks) {
    const standing = standings.find((s) => s.rank === rankConfig.place);
    if (!standing) {
      continue;
    }

    const amountMinor = percentOf(distributableMinor, rankConfig.percentBps);

    winners.push({
      userId: standing.userId,
      teamId: standing.teamId,
      teamName: standing.teamName,
      managerName: standing.managerName,
      rank: rankConfig.place,
      percentBps: rankConfig.percentBps,
      amountMinor,
    });
  }

  return {
    leagueId: league.id,
    leagueName: league.name,
    potTotalMinor: league.potTotalMinor,
    platformCommissionMinor,
    distributableMinor,
    winners,
    payoutSplitConfig: splitConfig,
  };
}

export async function commitPayoutDistribution(
  leagueId: string,
  preview: PayoutPreview,
  idempotencyKey: string,
): Promise<void> {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });

  if (!league) {
    throw new AppError(404, 'League not found');
  }

  if (league.payoutStatus === 'DISTRIBUTED') {
    return;
  }

  const { postBalancedEntries } = await import('../wallet/ledger.service');
  const { getOrCreateLeagueEscrowWallet, getOrCreatePlatformWallet, getOrCreateUserWallet } =
    await import('../wallet/wallet.service');

  await prisma.$transaction(async (tx) => {
    const escrowWallet = await getOrCreateLeagueEscrowWallet(leagueId, tx);
    const platformWallet = await getOrCreatePlatformWallet(tx);

    const entries: Parameters<typeof postBalancedEntries>[0]['entries'] = [];

    for (const winner of preview.winners) {
      if (winner.amountMinor <= 0) continue;

      const userWallet = await getOrCreateUserWallet(winner.userId, tx);

      entries.push(
        {
          walletId: escrowWallet.id,
          amountMinor: winner.amountMinor,
          direction: 'DEBIT',
          entryType: 'PAYOUT',
          referenceType: 'League',
          referenceId: leagueId,
          description: `Payout rank ${winner.rank}`,
        },
        {
          walletId: userWallet.id,
          amountMinor: winner.amountMinor,
          direction: 'CREDIT',
          entryType: 'PAYOUT',
          referenceType: 'League',
          referenceId: leagueId,
          description: `Payout rank ${winner.rank}`,
        },
      );
    }

    if (preview.platformCommissionMinor > 0) {
      entries.push(
        {
          walletId: escrowWallet.id,
          amountMinor: preview.platformCommissionMinor,
          direction: 'DEBIT',
          entryType: 'COMMISSION',
          referenceType: 'League',
          referenceId: leagueId,
          description: 'Platform commission',
        },
        {
          walletId: platformWallet.id,
          amountMinor: preview.platformCommissionMinor,
          direction: 'CREDIT',
          entryType: 'COMMISSION',
          referenceType: 'League',
          referenceId: leagueId,
          description: 'Platform commission',
        },
      );
    }

    if (entries.length >= 2) {
      await postBalancedEntries({ tx, idempotencyKey, entries });
    }

    await tx.league.update({
      where: { id: leagueId },
      data: { payoutStatus: 'DISTRIBUTED' },
    });
  });
}
