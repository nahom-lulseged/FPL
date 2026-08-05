import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  triggerElementSummaryBackfill,
  triggerManualSync,
  triggerSyncByType,
} from '@/api/ingestion.api';
import type { SyncTriggerType } from '@/types/ingestionStatus';

export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type: SyncTriggerType) =>
      type === 'all' ? triggerManualSync() : triggerSyncByType(type),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ingestion', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['ingestion', 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
      ]);
    },
  });
}

export function useElementSummaryBackfill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body?: { limit?: number; delayMs?: number }) =>
      triggerElementSummaryBackfill(body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ingestion', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['ingestion', 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'players'] }),
      ]);
    },
  });
}
