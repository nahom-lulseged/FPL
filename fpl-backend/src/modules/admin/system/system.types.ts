export type SystemHealthStatus = 'ok' | 'degraded' | 'down';

export interface SystemHealthResponse {
  status: SystemHealthStatus;
  timestamp: string;
  db: { ok: boolean; latencyMs: number };
  redis: { ok: boolean; latencyMs: number };
  queues: Array<{
    name: string;
    active: number;
    waiting: number;
    failed: number;
    delayed: number;
  }>;
  memory: { heapUsedMb: number; rssMb: number; heapTotalMb: number };
  uptimeSeconds: number;
}

export interface AlertConfigItem {
  alertType: string;
  webhookUrl: string;
  enabled: boolean;
}

export interface LogEntryResponse {
  time: string;
  level: string;
  msg: string;
  data?: Record<string, unknown>;
}
