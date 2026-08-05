import { apiClient } from '@/api/client';
import type {
  ChipUsageResponse,
  ExportEntity,
  GrowthQueryParams,
  GrowthResponse,
  TransferTrendsResponse,
} from '@/types/analytics';

export async function getTransferTrends(gameweek?: number): Promise<TransferTrendsResponse> {
  const { data } = await apiClient.get<TransferTrendsResponse>('/api/admin/analytics/transfers', {
    params: gameweek !== undefined ? { gameweek } : undefined,
  });
  return data;
}

export async function getChipUsage(): Promise<ChipUsageResponse> {
  const { data } = await apiClient.get<ChipUsageResponse>('/api/admin/analytics/chips');
  return data;
}

export async function getGrowthMetrics(params: GrowthQueryParams): Promise<GrowthResponse> {
  const { data } = await apiClient.get<GrowthResponse>('/api/admin/analytics/growth', {
    params,
  });
  return data;
}

export async function exportEntityCsv(entity: ExportEntity): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/api/admin/analytics/export/${entity}`, {
    responseType: 'blob',
  });
  return data;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportFilename(entity: ExportEntity): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${entity}-${date}.csv`;
}
