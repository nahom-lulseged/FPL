import { prisma } from '../config/db';
import { logger } from '../lib/logger';

export async function processFraudDetection(): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [recentDeposits, recentWithdrawals] = await Promise.all([
    prisma.deposit.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since }, status: 'COMPLETED' },
      _count: { _all: true },
    }),
    prisma.withdrawal.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const withdrawalCountByUser = new Map(
    recentWithdrawals.map((row) => [row.userId, row._count._all]),
  );

  const rapidCycleUserIds = recentDeposits
    .filter((row) => {
      const withdrawals = withdrawalCountByUser.get(row.userId) ?? 0;
      return row._count._all >= 2 && withdrawals >= 2;
    })
    .map((row) => row.userId);

  if (rapidCycleUserIds.length > 0) {
    logger.warn(
      { userIds: rapidCycleUserIds },
      'Fraud detection: rapid deposit-withdraw cycles flagged',
    );
  }

  const stakedLeagueCounts = await prisma.league.groupBy({
    by: ['adminUserId'],
    where: {
      stakeAmountMinor: { not: null },
      createdAt: { gte: since },
    },
    _count: { _all: true },
  });

  const repeatedPoolAdmins = stakedLeagueCounts
    .filter((row) => row._count._all >= 5)
    .map((row) => row.adminUserId);

  if (repeatedPoolAdmins.length > 0) {
    logger.warn(
      { admins: repeatedPoolAdmins },
      'Fraud detection: many small staked leagues from same creator',
    );
  }
}
