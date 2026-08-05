import { apiClient } from '@/api/client';
import type {
  IngestionStatus,
  ManualSyncResult,
  PaginatedResponse,
  SyncHistoryParams,
  SyncLogRow,
  SyncTriggerType,
} from '@/types/ingestionStatus';

export async function getIngestionStatus(): Promise<IngestionStatus> {
  const { data } = await apiClient.get<IngestionStatus>('/api/admin/ingestion/status');
  return data;
}

export async function triggerManualSync(): Promise<ManualSyncResult> {
  const { data } = await apiClient.post<ManualSyncResult>('/api/admin/ingestion/sync');
  return data;
}

export async function triggerSyncByType(type: SyncTriggerType): Promise<ManualSyncResult> {
  const { data } = await apiClient.post<ManualSyncResult>(`/api/admin/ingestion/sync/${type}`);
  return data;
}

export async function triggerElementSummaryBackfill(body?: {
  limit?: number;
  delayMs?: number;
}): Promise<{ success: boolean; queued?: boolean; jobId?: string; result?: ManualSyncResult['result'] }> {
  const { data } = await apiClient.post('/api/admin/ingestion/element-summary/backfill', body ?? {});
  return data;
}

export async function getSyncHistory(
  params: SyncHistoryParams = {},
): Promise<PaginatedResponse<SyncLogRow>> {
  const { data } = await apiClient.get<PaginatedResponse<SyncLogRow>>(
    '/api/admin/ingestion/history',
    { params },
  );
  return data;
}
