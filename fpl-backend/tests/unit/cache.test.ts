import { createHash } from 'crypto';

const mockStore = new Map<string, string>();

jest.mock('../../src/config/redis', () => ({
  redis: {
    get: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setex: jest.fn(async (key: string, _ttl: number, value: string) => {
      mockStore.set(key, value);
      return 'OK';
    }),
    set: jest.fn(async (key: string, value: string) => {
      mockStore.set(key, value);
      return 'OK';
    }),
    del: jest.fn(async (...keys: string[]) => {
      let removed = 0;
      for (const key of keys) {
        if (mockStore.delete(key)) removed += 1;
      }
      return removed;
    }),
    scan: jest.fn(async (_cursor: string, _match: string, pattern: string) => {
      const prefix = pattern.replace(/\*$/, '');
      return ['0', [...mockStore.keys()].filter((key) => key.startsWith(prefix))];
    }),
  },
}));

import { buildCacheKey, CACHE_PREFIX, getOrSet, invalidateByPrefix } from '../../src/lib/cache';
import { redis } from '../../src/config/redis';

describe('cache', () => {
  beforeEach(async () => {
    mockStore.clear();
    await invalidateByPrefix(CACHE_PREFIX.players);
    await invalidateByPrefix(CACHE_PREFIX.fixtures);
    await invalidateByPrefix(CACHE_PREFIX.standings);
  });

  it('buildCacheKey is stable for the same params regardless of key order', () => {
    const keyA = buildCacheKey('test', { page: 1, search: 'salah', limit: 50 });
    const keyB = buildCacheKey('test', { limit: 50, search: 'salah', page: 1 });
    expect(keyA).toBe(keyB);
    expect(keyA.startsWith('test:')).toBe(true);
  });

  it('getOrSet returns cached value on second call', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return { value: 'cached-result' };
    };

    const key = `test:${createHash('sha256').update('unit').digest('hex').slice(0, 8)}`;
    const first = await getOrSet(key, 60, fetcher);
    const second = await getOrSet(key, 60, fetcher);

    expect(first).toEqual({ value: 'cached-result' });
    expect(second).toEqual({ value: 'cached-result' });
    expect(calls).toBe(1);
  });

  it('invalidateByPrefix removes matching keys', async () => {
    const key = `${CACHE_PREFIX.players}:abc123`;
    await redis.setex(key, 60, JSON.stringify({ ok: true }));

    await invalidateByPrefix(CACHE_PREFIX.players);

    const cached = await redis.get(key);
    expect(cached).toBeNull();
  });
});
