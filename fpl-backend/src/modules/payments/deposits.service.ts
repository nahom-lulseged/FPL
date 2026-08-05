import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/db';
import { platformConfig } from '../../config/platformConfig';
import { assertPositiveMinor } from '../../lib/money';
import { AppError } from '../../middleware/errorHandler';
import { retryTransaction, LEDGER_TX_OPTIONS } from '../../lib/retryTransaction';
import { postBalancedEntries, toAppError } from '../wallet/ledger.service';
import { getOrCreatePlatformWallet, getOrCreateUserWallet } from '../wallet/wallet.service';
import { getPaymentProvider } from './providers';

export async function initiateDeposit(userId: string, amountMinor: number) {
  assertPositiveMinor(amountMinor, 'deposit amount');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const provider = getPaymentProvider();

  // Always set a unique pending key — Mongo unique indexes allow only one null.
  const deposit = await prisma.deposit.create({
    data: {
      userId,
      amountMinor,
      provider: provider.name,
      status: 'PENDING',
      idempotencyKey: `pending:${randomUUID()}`,
    },
  });

  const result = await provider.initiateDeposit({
    amountMinor,
    userId,
    depositId: deposit.id,
    email: user.email ?? 'telegram-user@invalid.local',
  });

  await prisma.deposit.update({
    where: { id: deposit.id },
    data: { paymentProviderRef: result.providerRef },
  });

  return {
    depositId: deposit.id,
    redirectUrl: result.redirectUrl,
    amountMinor,
    status: deposit.status,
  };
}

export async function completeDepositFromWebhook(
  providerRef: string,
  amountMinor: number,
  idempotencyKey: string,
) {
  const deposit = await prisma.deposit.findFirst({
    where: { paymentProviderRef: providerRef },
  });

  if (!deposit) {
    throw new AppError(404, 'Deposit not found');
  }

  if (deposit.status === 'COMPLETED') {
    return deposit;
  }

  if (deposit.amountMinor !== amountMinor) {
    throw new AppError(400, 'Deposit amount mismatch');
  }

  // Prefetch wallets outside the interactive transaction to keep the tx short.
  const userWallet = await getOrCreateUserWallet(deposit.userId);
  const platformWallet = await getOrCreatePlatformWallet();

  try {
    await retryTransaction(() =>
      prisma.$transaction(async (tx) => {
        await postBalancedEntries({
          tx,
          idempotencyKey,
          entries: [
            {
              walletId: userWallet.id,
              amountMinor,
              direction: 'CREDIT',
              entryType: 'DEPOSIT',
              referenceType: 'Deposit',
              referenceId: deposit.id,
              description: 'Wallet deposit',
            },
            {
              walletId: platformWallet.id,
              amountMinor,
              direction: 'DEBIT',
              entryType: 'DEPOSIT',
              referenceType: 'Deposit',
              referenceId: deposit.id,
              description: 'External deposit source',
            },
          ],
        });

        await tx.deposit.update({
          where: { id: deposit.id },
          data: { status: 'COMPLETED', idempotencyKey },
        });
      }, LEDGER_TX_OPTIONS),
    );
  } catch (err) {
    throw toAppError(err);
  }

  return prisma.deposit.findUniqueOrThrow({ where: { id: deposit.id } });
}

export async function failDeposit(providerRef: string) {
  const deposit = await prisma.deposit.findFirst({
    where: { paymentProviderRef: providerRef },
  });

  if (!deposit) {
    throw new AppError(404, 'Deposit not found');
  }

  if (deposit.status !== 'PENDING') {
    return deposit;
  }

  return prisma.deposit.update({
    where: { id: deposit.id },
    data: { status: 'FAILED' },
  });
}

export async function listPendingDeposits(options: { page: number; limit: number }) {
  const skip = (options.page - 1) * options.limit;

  const [data, total] = await Promise.all([
    prisma.deposit.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: options.limit,
    }),
    prisma.deposit.count({ where: { status: 'PENDING' } }),
  ]);

  return { data, total };
}

export async function approveDeposit(depositId: string, adminId: string): Promise<void> {
  const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });

  if (!deposit) {
    throw new AppError(404, 'Deposit not found');
  }

  if (deposit.status !== 'PENDING') {
    throw new AppError(400, 'Deposit is not pending');
  }

  let providerRef = deposit.paymentProviderRef;
  if (!providerRef) {
    providerRef = `mock_dep_${deposit.id}`;
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: { paymentProviderRef: providerRef },
    });
  }

  await completeDepositFromWebhook(
    providerRef,
    deposit.amountMinor,
    `admin:${deposit.id}`,
  );

  void adminId;
}

export async function rejectDeposit(depositId: string, reason: string): Promise<void> {
  const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });

  if (!deposit) {
    throw new AppError(404, 'Deposit not found');
  }

  if (deposit.status !== 'PENDING') {
    throw new AppError(400, 'Deposit is not pending');
  }

  await prisma.deposit.update({
    where: { id: depositId },
    data: { status: 'FAILED', rejectionReason: reason },
  });
}

export async function requestWithdrawal(userId: string, amountMinor: number) {
  assertPositiveMinor(amountMinor, 'withdrawal amount');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, kycVerifiedAt: true },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (!user.kycVerifiedAt) {
    throw new AppError(403, 'KYC verification required before withdrawal');
  }

  const wallet = await getOrCreateUserWallet(userId);
  if (wallet.balanceMinor < amountMinor) {
    throw new AppError(400, 'Insufficient wallet balance');
  }

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId,
      amountMinor,
      provider: getPaymentProvider().name,
      status: 'PENDING',
      kycVerifiedAt: user.kycVerifiedAt,
    },
  });

  return withdrawal;
}

export async function listPendingWithdrawals(options: { page: number; limit: number }) {
  const skip = (options.page - 1) * options.limit;

  const [data, total] = await Promise.all([
    prisma.withdrawal.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, email: true, displayName: true, kycVerifiedAt: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: options.limit,
    }),
    prisma.withdrawal.count({ where: { status: 'PENDING' } }),
  ]);

  return { data, total };
}

export async function approveWithdrawal(
  withdrawalId: string,
  adminId: string,
): Promise<void> {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: { select: { email: true } } },
  });

  if (!withdrawal) {
    throw new AppError(404, 'Withdrawal not found');
  }

  if (withdrawal.status !== 'PENDING') {
    throw new AppError(400, 'Withdrawal is not pending');
  }

  const provider = getPaymentProvider();
  const payout = await provider.initiatePayout({
    amountMinor: withdrawal.amountMinor,
    userId: withdrawal.userId,
    withdrawalId: withdrawal.id,
    email: withdrawal.user.email ?? 'telegram-user@invalid.local',
  });

  const idempotencyKey = `withdrawal:${withdrawal.id}`;
  const userWallet = await getOrCreateUserWallet(withdrawal.userId);
  const platformWallet = await getOrCreatePlatformWallet();

  try {
    await retryTransaction(() =>
      prisma.$transaction(async (tx) => {
        await postBalancedEntries({
          tx,
          idempotencyKey,
          entries: [
            {
              walletId: userWallet.id,
              amountMinor: withdrawal.amountMinor,
              direction: 'DEBIT',
              entryType: 'WITHDRAWAL',
              referenceType: 'Withdrawal',
              referenceId: withdrawal.id,
              description: 'Withdrawal to bank',
            },
            {
              walletId: platformWallet.id,
              amountMinor: withdrawal.amountMinor,
              direction: 'CREDIT',
              entryType: 'WITHDRAWAL',
              referenceType: 'Withdrawal',
              referenceId: withdrawal.id,
              description: 'External withdrawal sink',
            },
          ],
        });

        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: payout.status === 'COMPLETED' ? 'COMPLETED' : 'APPROVED',
            paymentProviderRef: payout.providerRef,
          },
        });
      }, LEDGER_TX_OPTIONS),
    );
  } catch (err) {
    throw toAppError(err);
  }

  void adminId;
}

export async function rejectWithdrawal(
  withdrawalId: string,
  reason: string,
): Promise<void> {
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });

  if (!withdrawal) {
    throw new AppError(404, 'Withdrawal not found');
  }

  if (withdrawal.status !== 'PENDING') {
    throw new AppError(400, 'Withdrawal is not pending');
  }

  await prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: { status: 'REJECTED', rejectionReason: reason },
  });
}

export type PaymentTransactionKind = 'deposit' | 'withdraw';

export interface PaymentTransactionRow {
  id: string;
  kind: PaymentTransactionKind;
  amountMinor: number;
  status: string;
  provider: string;
  paymentProviderRef: string | null;
  rejectionReason: string | null;
  idempotencyKey: string | null;
  kycVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; email: string | null; displayName: string };
}

const transactionUserSelect = { id: true, email: true, displayName: true } as const;

function mapDepositToTransaction(row: {
  id: string;
  amountMinor: number;
  status: string;
  provider: string;
  paymentProviderRef: string | null;
  rejectionReason: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; email: string | null; displayName: string };
}): PaymentTransactionRow {
  return {
    id: row.id,
    kind: 'deposit',
    amountMinor: row.amountMinor,
    status: row.status,
    provider: row.provider,
    paymentProviderRef: row.paymentProviderRef,
    rejectionReason: row.rejectionReason,
    idempotencyKey: row.idempotencyKey,
    kycVerifiedAt: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: row.user,
  };
}

function mapWithdrawalToTransaction(row: {
  id: string;
  amountMinor: number;
  status: string;
  provider: string;
  paymentProviderRef: string | null;
  rejectionReason: string | null;
  kycVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; email: string | null; displayName: string };
}): PaymentTransactionRow {
  return {
    id: row.id,
    kind: 'withdraw',
    amountMinor: row.amountMinor,
    status: row.status,
    provider: row.provider,
    paymentProviderRef: row.paymentProviderRef,
    rejectionReason: row.rejectionReason,
    idempotencyKey: null,
    kycVerifiedAt: row.kycVerifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: row.user,
  };
}

export async function listPaymentTransactions(options: {
  type: 'all' | PaymentTransactionKind;
  page: number;
  limit: number;
}): Promise<{ data: PaymentTransactionRow[]; total: number }> {
  const skip = (options.page - 1) * options.limit;

  if (options.type === 'deposit') {
    const [rows, total] = await Promise.all([
      prisma.deposit.findMany({
        include: { user: { select: transactionUserSelect } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: options.limit,
      }),
      prisma.deposit.count(),
    ]);
    return { data: rows.map(mapDepositToTransaction), total };
  }

  if (options.type === 'withdraw') {
    const [rows, total] = await Promise.all([
      prisma.withdrawal.findMany({
        include: { user: { select: transactionUserSelect } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: options.limit,
      }),
      prisma.withdrawal.count(),
    ]);
    return { data: rows.map(mapWithdrawalToTransaction), total };
  }

  const take = options.page * options.limit;
  const [deposits, withdrawals, depositCount, withdrawalCount] = await Promise.all([
    prisma.deposit.findMany({
      include: { user: { select: transactionUserSelect } },
      orderBy: { createdAt: 'desc' },
      take,
    }),
    prisma.withdrawal.findMany({
      include: { user: { select: transactionUserSelect } },
      orderBy: { createdAt: 'desc' },
      take,
    }),
    prisma.deposit.count(),
    prisma.withdrawal.count(),
  ]);

  const merged = [
    ...deposits.map(mapDepositToTransaction),
    ...withdrawals.map(mapWithdrawalToTransaction),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    data: merged.slice(skip, skip + options.limit),
    total: depositCount + withdrawalCount,
  };
}

export async function getCommissionTotal(): Promise<number> {
  const platformWallet = await getOrCreatePlatformWallet();
  const commissionEntries = await prisma.ledgerEntry.aggregate({
    where: {
      walletId: platformWallet.id,
      entryType: 'COMMISSION',
      direction: 'CREDIT',
    },
    _sum: { amountMinor: true },
  });

  return commissionEntries._sum.amountMinor ?? 0;
}

void platformConfig;
