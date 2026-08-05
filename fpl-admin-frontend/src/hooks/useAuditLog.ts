import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchRecentAuditLogs, listAuditLogs } from '@/api/audit.api';
import type { AuditLogListParams } from '@/types/auditLog';

export function useAuditLogList(params: AuditLogListParams) {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => listAuditLogs(params),
    placeholderData: keepPreviousData,
  });
}

export function useRecentAuditLog(limit = 10) {
  return useQuery({
    queryKey: ['admin', 'audit', 'recent', limit],
    queryFn: () => fetchRecentAuditLogs(limit),
  });
}
