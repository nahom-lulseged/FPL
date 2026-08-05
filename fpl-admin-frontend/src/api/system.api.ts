import { apiClient } from '@/api/client';
import type {
  AlertConfigItem,
  LogEntry,
  SystemHealth,
  SystemLogsParams,
} from '@/types/system';

export async function getSystemHealth(): Promise<SystemHealth> {
  const { data } = await apiClient.get<SystemHealth>('/api/admin/system/health');
  return data;
}

export async function getSystemLogs(
  params: SystemLogsParams,
): Promise<{ logs: LogEntry[] }> {
  const { data } = await apiClient.get<{ logs: LogEntry[] }>('/api/admin/system/logs', {
    params,
  });
  return data;
}

export async function getAlertConfigs(): Promise<{ configs: AlertConfigItem[] }> {
  const { data } = await apiClient.get<{ configs: AlertConfigItem[] }>(
    '/api/admin/system/alerts',
  );
  return data;
}

export async function updateAlertConfigs(
  configs: AlertConfigItem[],
): Promise<{ configs: AlertConfigItem[] }> {
  const { data } = await apiClient.put<{ configs: AlertConfigItem[] }>(
    '/api/admin/system/alerts',
    { configs },
  );
  return data;
}

export async function createQueuesSession(): Promise<void> {
  await apiClient.post('/api/admin/system/queues/session', undefined, {
    withCredentials: true,
  });
}

export async function sendTestAlert(): Promise<{ sent: boolean }> {
  const { data } = await apiClient.post<{ sent: boolean }>('/api/admin/system/alerts/test');
  return data;
}
