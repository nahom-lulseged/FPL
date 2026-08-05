import { apiClient } from '@/api/client';
import type { WalletSummary, LedgerHistoryResponse } from '@/types/wallet';

export async function getWallet(): Promise<WalletSummary> {
  const { data } = await apiClient.get<WalletSummary>('/api/wallet');
  return data;
}

export async function getLedgerHistory(params?: {
  page?: number;
  limit?: number;
}): Promise<LedgerHistoryResponse> {
  const { data } = await apiClient.get<LedgerHistoryResponse>('/api/wallet/ledger', { params });
  return data;
}
