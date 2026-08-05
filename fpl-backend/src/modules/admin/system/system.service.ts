import { env } from '../../../config/env';
import { getQueueDepths } from '../../../jobs/queue';
import { checkDbLatency, checkRedisLatency } from '../../../lib/healthChecks';
import { getRecentLogs } from '../../../lib/logger';
import { ADMIN_ACCESS_COOKIE } from '../../../middleware/authGuard';
import type { LogsQuery } from './system.validation';
import type { SystemHealthResponse } from './system.types';
import { getAlertConfigs, updateAlertConfigs } from './alert.service';
import type { AlertType } from '@prisma/client';

export async function getSystemHealth(): Promise<SystemHealthResponse> {
  const [db, redisCheck, queues] = await Promise.all([
    checkDbLatency(),
    checkRedisLatency(),
    getQueueDepths(),
  ]);

  const mem = process.memoryUsage();
  const threshold = env.ALERT_QUEUE_FAILED_THRESHOLD;

  let status: SystemHealthResponse['status'] = 'ok';
  if (!db.ok || !redisCheck.ok) {
    status = 'down';
  } else if (queues.some((q) => q.failed >= threshold)) {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    db,
    redis: redisCheck,
    queues,
    memory: {
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
    },
    uptimeSeconds: Math.round(process.uptime()),
  };
}

export function getSystemLogs(query: LogsQuery) {
  return getRecentLogs({
    level: query.level,
    search: query.search,
    limit: query.limit,
  });
}

export { getAlertConfigs, updateAlertConfigs };

export async function createQueuesSession(accessToken: string): Promise<void> {
  // Token is set as cookie by the route handler; this export exists for testability.
  void accessToken;
}

export function buildQueuesSessionCookie(token: string): string {
  const maxAge = 3600;
  return `${ADMIN_ACCESS_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/admin/queues; SameSite=Lax; Max-Age=${maxAge}`;
}

export type { AlertType };
