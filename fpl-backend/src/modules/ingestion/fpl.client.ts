import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import type {
  FplBootstrapStatic,
  FplElementSummary,
  FplFixture,
  FplGameweekLive,
} from './fpl.types';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(path: string): Promise<T> {
  const url = `${env.FPL_API_BASE_URL}${path}`;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(12_000),
        headers: {
          'User-Agent': 'FPL-Clone-Backend/0.1',
        },
      });

      if (!response.ok) {
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
          continue;
        }
        throw new Error(`FPL API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        logger.warn({ attempt, path, err: lastError.message }, 'FPL API retry');
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError ?? new Error('FPL API request failed');
}

export function fetchBootstrapStatic(): Promise<FplBootstrapStatic> {
  return fetchWithRetry<FplBootstrapStatic>('/bootstrap-static/');
}

export function fetchFixtures(): Promise<FplFixture[]> {
  return fetchWithRetry<FplFixture[]>('/fixtures/');
}

export function fetchGameweekLive(gameweek: number): Promise<FplGameweekLive> {
  return fetchWithRetry<FplGameweekLive>(`/event/${gameweek}/live/`);
}

export function fetchElementSummary(fplId: number): Promise<FplElementSummary> {
  return fetchWithRetry<FplElementSummary>(`/element-summary/${fplId}/`);
}
