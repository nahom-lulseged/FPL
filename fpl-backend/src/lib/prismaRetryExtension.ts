import { Prisma } from '@prisma/client';
import { logger } from './logger';

const RETRYABLE_CODES = new Set(['P1017', 'P1001', 'P1008']);
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 100;

function isRetryableError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && RETRYABLE_CODES.has(err.code);
}

function backoffMs(attempt: number): number {
  return BASE_BACKOFF_MS * 2 ** (attempt - 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createRetryExtension() {
  return Prisma.defineExtension({
    name: 'connectionRetry',
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          let attempt = 0;

          while (true) {
            try {
              return await query(args);
            } catch (err) {
              attempt += 1;

              if (!isRetryableError(err) || attempt > MAX_RETRIES) {
                throw err;
              }

              logger.warn(
                { attempt, maxRetries: MAX_RETRIES, code: err.code },
                'Prisma transient DB error — retrying',
              );

              // Do not call $disconnect() here — it invalidates in-flight interactive transactions (P2028).
              await sleep(backoffMs(attempt));
            }
          }
        },
      },
    },
  });
}
