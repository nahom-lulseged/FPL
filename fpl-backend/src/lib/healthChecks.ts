import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { logger } from './logger';

export interface LatencyCheck {
  ok: boolean;
  latencyMs: number;
}

export async function checkDbLatency(): Promise<LatencyCheck> {
  const start = performance.now();
  try {
    // Lightweight model read — mirrors real app DB usage (MongoDB via Prisma).
    // Prefer this over $runCommandRaw({ ping: 1 }), which can false-negative
    // while normal queries succeed.
    await prisma.user.findFirst({ select: { id: true } });
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch (err) {
    logger.warn({ err }, 'DB health check failed');
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}

export async function checkRedisLatency(): Promise<LatencyCheck> {
  const start = performance.now();
  try {
    const pong = await redis.ping();
    return { ok: pong === 'PONG', latencyMs: Math.round(performance.now() - start) };
  } catch (err) {
    logger.warn({ err }, 'Redis health check failed');
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}
