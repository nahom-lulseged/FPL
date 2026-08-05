import { Prisma } from '@prisma/client';
import { logger } from './logger';

/** MongoDB Atlas interactive txs often exceed Prisma's default 5s. */
export const LEDGER_TX_OPTIONS = { timeout: 20_000, maxWait: 10_000 } as const;

const RETRYABLE_CODES = new Set(['P1017', 'P1001', 'P1008', 'P2028', 'P2034']);
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 100;

function isRetryableError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && RETRYABLE_CODES.has(err.code);
}

function backoffMs(attempt: number): number {
  return BASE_BACKOFF_MS * 2 ** (attempt - 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry an entire prisma.$transaction callback on transient DB errors. */
export async function retryTransaction<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;

      if (!isRetryableError(err) || attempt > MAX_RETRIES) {
        throw err;
      }

      logger.warn(
        { attempt, maxRetries: MAX_RETRIES, code: (err as Prisma.PrismaClientKnownRequestError).code },
        'Transaction failed with transient DB error — retrying',
      );

      await sleep(backoffMs(attempt));
    }
  }
}
