import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../lib/logger';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const redisUrl = process.env.REDIS_URL ?? env.REDIS_URL;

export const redis =
  globalForRedis.redis ??
  new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

redis.on('error', (err) => {
  logger.warn({ err }, 'Redis connection error');
});

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export { redisUrl };

export function createBullConnection(): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}
