import type { LedgerDirection, LedgerEntryType, Prisma } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';

export interface LedgerLineInput {
  walletId: string;
  amountMinor: number;
  direction: LedgerDirection;
  entryType: LedgerEntryType;
  referenceType: string;
  referenceId: string;
  description?: string;
}

export interface PostBalancedEntriesInput {
  tx: Prisma.TransactionClient;
  idempotencyKey: string;
  entries: LedgerLineInput[];
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

export class InsufficientBalanceError extends LedgerError {
  constructor() {
    super('Insufficient wallet balance');
  }
}

export class DuplicateLedgerEntryError extends LedgerError {
  constructor() {
    super('Duplicate ledger entry');
  }
}

function validateBalanced(entries: LedgerLineInput[]): void {
  let credits = 0;
  let debits = 0;

  for (const entry of entries) {
    if (!Number.isInteger(entry.amountMinor) || entry.amountMinor <= 0) {
      throw new LedgerError('Each ledger line must have a positive integer amountMinor');
    }
    if (entry.direction === 'CREDIT') {
      credits += entry.amountMinor;
    } else {
      debits += entry.amountMinor;
    }
  }

  if (credits !== debits) {
    throw new LedgerError(`Unbalanced ledger entries: credits=${credits}, debits=${debits}`);
  }
}

async function entryExists(
  tx: Prisma.TransactionClient,
  idempotencyKey: string,
): Promise<boolean> {
  const existing = await tx.ledgerEntry.findFirst({
    where: { idempotencyKey },
    select: { id: true },
  });
  return existing !== null;
}

async function applyBalanceDelta(
  tx: Prisma.TransactionClient,
  walletId: string,
  direction: LedgerDirection,
  amountMinor: number,
): Promise<void> {
  const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) {
    throw new LedgerError(`Wallet not found: ${walletId}`);
  }

  const delta = direction === 'CREDIT' ? amountMinor : -amountMinor;
  const newBalance = wallet.balanceMinor + delta;

  if (wallet.walletType === 'USER' && newBalance < 0) {
    throw new InsufficientBalanceError();
  }

  await tx.wallet.update({
    where: { id: walletId },
    data: { balanceMinor: newBalance },
  });
}

/**
 * Single choke point for all ledger writes.
 * Validates balanced entries, enforces idempotency, updates cached balances.
 */
export async function postBalancedEntries(input: PostBalancedEntriesInput): Promise<void> {
  const { tx, idempotencyKey, entries } = input;

  if (entries.length < 2) {
    throw new LedgerError('Balanced transaction requires at least two entries');
  }

  validateBalanced(entries);

  if (await entryExists(tx, idempotencyKey)) {
    return;
  }

  for (const entry of entries) {
    await applyBalanceDelta(tx, entry.walletId, entry.direction, entry.amountMinor);

    await tx.ledgerEntry.create({
      data: {
        walletId: entry.walletId,
        amountMinor: entry.amountMinor,
        direction: entry.direction,
        entryType: entry.entryType,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        idempotencyKey,
        description: entry.description,
      },
    });
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof InsufficientBalanceError) {
    return new AppError(400, err.message);
  }
  if (err instanceof LedgerError) {
    return new AppError(400, err.message);
  }
  throw err;
}
