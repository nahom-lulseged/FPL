jest.mock('../../src/config/db', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../../src/config/redis', () => ({
  redis: {
    ping: jest.fn(),
  },
}));

jest.mock('../../src/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { logger } from '../../src/lib/logger';
import { checkDbLatency, checkRedisLatency } from '../../src/lib/healthChecks';

const findFirst = prisma.user.findFirst as jest.MockedFunction<typeof prisma.user.findFirst>;
const redisPing = redis.ping as jest.MockedFunction<typeof redis.ping>;

describe('healthChecks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDbLatency', () => {
    it('returns ok when a lightweight user read succeeds', async () => {
      findFirst.mockResolvedValue({ id: 'user-1' } as Awaited<ReturnType<typeof prisma.user.findFirst>>);

      const result = await checkDbLatency();

      expect(result.ok).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(findFirst).toHaveBeenCalledWith({ select: { id: true } });
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('returns not ok and logs when the user read fails', async () => {
      const err = new Error('connection refused');
      findFirst.mockRejectedValue(err);

      const result = await checkDbLatency();

      expect(result.ok).toBe(false);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(logger.warn).toHaveBeenCalledWith({ err }, 'DB health check failed');
    });
  });

  describe('checkRedisLatency', () => {
    it('returns ok when ping returns PONG', async () => {
      redisPing.mockResolvedValue('PONG');

      const result = await checkRedisLatency();

      expect(result.ok).toBe(true);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('returns not ok and logs when ping fails', async () => {
      const err = new Error('redis down');
      redisPing.mockRejectedValue(err);

      const result = await checkRedisLatency();

      expect(result.ok).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith({ err }, 'Redis health check failed');
    });
  });
});
