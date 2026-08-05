export type SystemHealthStatus = 'ok' | 'degraded' | 'down';

export interface SystemHealth {
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

export type AlertType = 'INGESTION_FAILURE' | 'QUEUE_BACKUP' | 'HIGH_ERROR_RATE';

export interface AlertConfigItem {
  alertType: AlertType;
  webhookUrl: string;
  enabled: boolean;
}

export interface LogEntry {
  time: string;
  level: string;
  msg: string;
  data?: Record<string, unknown>;
}

export interface SystemLogsParams {
  level?: 'error' | 'warn' | 'info';
  search?: string;
  limit?: number;
}
