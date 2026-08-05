import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getSyncHistory } from '@/api/ingestion.api';
import type { SyncHistoryParams } from '@/types/ingestionStatus';

export function useSyncHistory(params: SyncHistoryParams) {
  return useQuery({
    queryKey: ['ingestion', 'history', params],
    queryFn: () => getSyncHistory(params),
    placeholderData: keepPreviousData,
  });
}
