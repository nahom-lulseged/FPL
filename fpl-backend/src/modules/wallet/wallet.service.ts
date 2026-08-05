import type { WalletType, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { platformConfig } from '../../config/platformConfig';
import { AppError } from '../../middleware/errorHandler';

let platformWalletId: string | null = null;

export async function getOrCreateUserWallet(
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<{ id: string; balanceMinor: number; currency: string }> {
  const client = tx ?? prisma;

  const existing = await client.wallet.findFirst({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return client.wallet.create({
    data: {
      walletType: 'USER',
      userId,
      currency: platformConfig.currency,
      balanceMinor: 0,
    },
  });
}

export async function getOrCreateLeagueEscrowWallet(
  leagueId: string,
  tx?: Prisma.TransactionClient,
): Promise<{ id: string; balanceMinor: number }> {
  const client = tx ?? prisma;

  const existing = await client.wallet.findFirst({
    where: { leagueId },
  });

  if (existing) {
    return existing;
  }

  return client.wallet.create({
    data: {
      walletType: 'LEAGUE_ESCROW',
      leagueId,
      currency: platformConfig.currency,
      balanceMinor: 0,
    },
  });
}

export async function getOrCreatePlatformWallet(
  tx?: Prisma.TransactionClient,
): Promise<{ id: string; balanceMinor: number }> {
  if (platformWalletId && !tx) {
    const cached = await prisma.wallet.findUnique({ where: { id: platformWalletId } });
    if (cached) {
      return cached;
    }
  }

  const client = tx ?? prisma;
  const existing = await client.wallet.findFirst({
    where: { walletType: 'PLATFORM' },
  });

  if (existing) {
    platformWalletId = existing.id;
    return existing;
  }

  const created = await client.wallet.create({
    data: {
      walletType: 'PLATFORM',
      currency: platformConfig.currency,
      balanceMinor: 0,
    },
  });
  platformWalletId = created.id;
  return created;
}

export async function getWalletForUser(userId: string) {
  const wallet = await getOrCreateUserWallet(userId);
  return {
    id: wallet.id,
    balanceMinor: wallet.balanceMinor,
    currency: wallet.currency,
    balanceFormatted: wallet.balanceMinor,
  };
}

export async function listLedgerForUser(
  userId: string,
  options: { page: number; limit: number },
) {
  const wallet = await getOrCreateUserWallet(userId);

  const skip = (options.page - 1) * options.limit;

  const [entries, total] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: options.limit,
    }),
    prisma.ledgerEntry.count({ where: { walletId: wallet.id } }),
  ]);

  return { wallet, entries, total };
}

export async function reconcileWallet(walletId: string): Promise<{
  walletId: string;
  cachedBalanceMinor: number;
  computedBalanceMinor: number;
  matches: boolean;
}> {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) {
    throw new AppError(404, 'Wallet not found');
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: { walletId },
    select: { amountMinor: true, direction: true },
  });

  let computed = 0;
  for (const entry of entries) {
    computed += entry.direction === 'CREDIT' ? entry.amountMinor : -entry.amountMinor;
  }

  return {
    walletId,
    cachedBalanceMinor: wallet.balanceMinor,
    computedBalanceMinor: computed,
    matches: wallet.balanceMinor === computed,
  };
}

export async function reconcileAllWallets(): Promise<{
  total: number;
  mismatches: Array<{
    walletId: string;
    walletType: WalletType;
    cachedBalanceMinor: number;
    computedBalanceMinor: number;
  }>;
}> {
  const wallets = await prisma.wallet.findMany({ select: { id: true } });
  const mismatches: Array<{
    walletId: string;
    walletType: WalletType;
    cachedBalanceMinor: number;
    computedBalanceMinor: number;
  }> = [];

  for (const { id } of wallets) {
    const result = await reconcileWallet(id);
    if (!result.matches) {
      const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id } });
      mismatches.push({
        walletId: id,
        walletType: wallet.walletType,
        cachedBalanceMinor: result.cachedBalanceMinor,
        computedBalanceMinor: result.computedBalanceMinor,
      });
    }
  }

  return { total: wallets.length, mismatches };
}

export async function searchWalletByUserEmail(email: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, displayName: true },
  });

  if (!user) {
    return null;
  }

  const wallet = await getOrCreateUserWallet(user.id);
  const reconciliation = await reconcileWallet(wallet.id);

  return {
    user,
    wallet,
    reconciliation,
  };
}

export async function listLedgerForWalletId(
  walletId: string,
  options: { page: number; limit: number },
) {
  const skip = (options.page - 1) * options.limit;

  const [entries, total] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: options.limit,
    }),
    prisma.ledgerEntry.count({ where: { walletId } }),
  ]);

  return { entries, total };
}
