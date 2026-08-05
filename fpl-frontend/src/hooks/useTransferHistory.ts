import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getTransferHistory } from '@/api/transfers.api';
import type { TransferHistoryParams } from '@/types/transfer';

export function useTransferHistory(teamId: string | undefined, params: TransferHistoryParams = {}) {
  return useQuery({
    queryKey: ['transferHistory', teamId, params],
    queryFn: () => getTransferHistory(teamId!, params),
    enabled: Boolean(teamId),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
