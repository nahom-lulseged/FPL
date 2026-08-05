import { apiClient } from '@/api/client';
import type { PaginatedResponse } from '@/types/api';
import type {
  SubmitTransfersResponse,
  TransferHistoryItem,
  TransferHistoryParams,
  SubmitTransfersInput,
} from '@/types/transfer';

export async function submitTransfers(
  teamId: string,
  input: SubmitTransfersInput,
): Promise<SubmitTransfersResponse> {
  const { data } = await apiClient.post<SubmitTransfersResponse>(
    `/api/teams/${teamId}/transfers`,
    input,
  );
  return data;
}

export async function getTransferHistory(
  teamId: string,
  params: TransferHistoryParams = {},
): Promise<PaginatedResponse<TransferHistoryItem>> {
  const { data } = await apiClient.get<PaginatedResponse<TransferHistoryItem>>(
    `/api/teams/${teamId}/transfers`,
    { params },
  );
  return data;
}
