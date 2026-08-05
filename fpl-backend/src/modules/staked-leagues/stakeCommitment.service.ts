import { prisma } from '../../config/db';
import { platformConfig } from '../../config/platformConfig';
import { AppError } from '../../middleware/errorHandler';
import { postBalancedEntries, toAppError } from '../wallet/ledger.service';
import { getOrCreateLeagueEscrowWallet, getOrCreateUserWallet } from '../wallet/wallet.service';

export function validateStakeAmount(stakeAmountMinor: number): void {
  if (!Number.isInteger(stakeAmountMinor) || stakeAmountMinor <= 0) {
    throw new AppError(400, 'Stake amount must be a positive integer');
  }
  if (stakeAmountMinor > platformConfig.maxStakeMinor) {
    throw new AppError(400, `Maximum stake is ${platformConfig.maxStakeMinor} minor units`);
  }
}

export async function commitStakeHold(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    userId: string;
    leagueId: string;
    stakeAmountMinor: number;
    referenceId: string;
    idempotencyKey: string;
  },
): Promise<void> {
  const userWallet = await getOrCreateUserWallet(params.userId, tx);
  const escrowWallet = await getOrCreateLeagueEscrowWallet(params.leagueId, tx);

  try {
    await postBalancedEntries({
      tx,
      idempotencyKey: params.idempotencyKey,
      entries: [
        {
          walletId: userWallet.id,
          amountMinor: params.stakeAmountMinor,
          direction: 'DEBIT',
          entryType: 'STAKE_HOLD',
          referenceType: 'LeagueMembership',
          referenceId: params.referenceId,
          description: 'Stake commitment',
        },
        {
          walletId: escrowWallet.id,
          amountMinor: params.stakeAmountMinor,
          direction: 'CREDIT',
          entryType: 'STAKE_HOLD',
          referenceType: 'LeagueMembership',
          referenceId: params.referenceId,
          description: 'League pot contribution',
        },
      ],
    });
  } catch (err) {
    throw toAppError(err);
  }

  await tx.league.update({
    where: { id: params.leagueId },
    data: { potTotalMinor: { increment: params.stakeAmountMinor } },
  });
}

export async function assertPotLimit(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  leagueId: string,
  additionalStakeMinor: number,
): Promise<void> {
  const league = await tx.league.findUnique({
    where: { id: leagueId },
    select: { potTotalMinor: true, stakeAmountMinor: true },
  });

  if (!league?.stakeAmountMinor) {
    return;
  }

  const newPot = league.potTotalMinor + additionalStakeMinor;
  if (newPot > platformConfig.maxPotMinor) {
    throw new AppError(400, 'League pot would exceed platform maximum');
  }
}
