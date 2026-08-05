import { apiClient } from '@/api/client';
import type { AuditLogListParams, AuditLogListResponse } from '@/types/auditLog';

export async function listAuditLogs(
  params: AuditLogListParams = {},
): Promise<AuditLogListResponse> {
  const { data } = await apiClient.get<AuditLogListResponse>('/api/admin/audit', { params });
  return data;
}

export async function fetchRecentAuditLogs(limit = 10): Promise<AuditLogListResponse> {
  return listAuditLogs({ page: 1, limit });
}
