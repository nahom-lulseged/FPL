import { apiClient } from '@/api/client';
import type {
  CorrectionCommitResponse,
  CorrectionPreviewResponse,
  PaginatedResponse,
  RecalculateCommitResponse,
  RecalculatePreviewResponse,
  RecalculationHistoryDetail,
  RecalculationHistoryItem,
  StatTypeOption,
} from '@/types/scoring';

export async function listStatTypes(): Promise<StatTypeOption[]> {
  const { data } = await apiClient.get<{ data: StatTypeOption[] }>(
    '/api/admin/scoring/stat-types',
  );
  return data.data;
}

export async function previewRecalculate(
  gameweekId: string,
): Promise<RecalculatePreviewResponse> {
  const { data } = await apiClient.get<RecalculatePreviewResponse>(
    `/api/admin/scoring/recalculate/${gameweekId}/preview`,
  );
  return data;
}

export async function commitRecalculate(
  gameweekId: string,
  body: { previewToken: string; reason: string },
): Promise<RecalculateCommitResponse> {
  const { data } = await apiClient.post<RecalculateCommitResponse>(
    `/api/admin/scoring/recalculate/${gameweekId}`,
    body,
  );
  return data;
}

export async function previewCorrection(body: {
  playerId: string;
  gameweekId: string;
  statType: string;
  newValue: number | boolean;
}): Promise<CorrectionPreviewResponse> {
  const { data } = await apiClient.post<CorrectionPreviewResponse>(
    '/api/admin/scoring/correct/preview',
    body,
  );
  return data;
}

export async function commitCorrection(body: {
  previewToken: string;
  reason: string;
}): Promise<CorrectionCommitResponse> {
  const { data } = await apiClient.post<CorrectionCommitResponse>(
    '/api/admin/scoring/correct',
    body,
  );
  return data;
}

export async function listRecalculationHistory(params: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<RecalculationHistoryItem>> {
  const { data } = await apiClient.get<PaginatedResponse<RecalculationHistoryItem>>(
    '/api/admin/scoring/recalculation-history',
    { params },
  );
  return data;
}

export async function getRecalculationHistoryEntry(
  id: string,
): Promise<RecalculationHistoryDetail> {
  const { data } = await apiClient.get<RecalculationHistoryDetail>(
    `/api/admin/scoring/recalculation-history/${id}`,
  );
  return data;
}
