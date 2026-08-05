import { apiClient } from '@/api/client';

export interface WalletLookupResult {
  user: { id: string; email: string; displayName: string };
  wallet: { id: string; balanceMinor: number; currency: string };
  reconciliation: {
    matches: boolean;
    cachedBalanceMinor: number;
    computedBalanceMinor: number;
  };
  ledger: Array<{
    id: string;
    amountMinor: number;
    direction: string;
    entryType: string;
    createdAt: string;
  }>;
}

export interface WithdrawalRow {
  id: string;
  amountMinor: number;
  status: string;
  user: { id: string; email: string; displayName: string };
  createdAt: string;
}

export interface DepositRow {
  id: string;
  amountMinor: number;
  status: string;
  user: { id: string; email: string; displayName: string };
  createdAt: string;
}

export type TransactionKind = 'deposit' | 'withdraw';

export interface TransactionRow {
  id: string;
  kind: TransactionKind;
  amountMinor: number;
  status: string;
  provider: string;
  paymentProviderRef: string | null;
  rejectionReason: string | null;
  idempotencyKey: string | null;
  kycVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; displayName: string };
}

export interface TransactionsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PayoutPreviewResponse {
  preview: {
    leagueId: string;
    leagueName: string;
    potTotalMinor: number;
    platformCommissionMinor: number;
    distributableMinor: number;
    winners: Array<{
      managerName: string;
      rank: number;
      amountMinor: number;
    }>;
  };
  previewToken: string;
}

export async function lookupWallet(email: string): Promise<WalletLookupResult> {
  const { data } = await apiClient.get<WalletLookupResult>('/api/admin/finance/wallets/lookup', {
    params: { email },
  });
  return data;
}

export async function listPendingWithdrawals(params?: { page?: number; limit?: number }) {
  const { data } = await apiClient.get<{ data: WithdrawalRow[]; meta: unknown }>(
    '/api/admin/finance/withdrawals',
    { params },
  );
  return data;
}

export async function listPendingDeposits(params?: { page?: number; limit?: number }) {
  const { data } = await apiClient.get<{ data: DepositRow[]; meta: unknown }>(
    '/api/admin/finance/deposits',
    { params },
  );
  return data;
}

export async function listTransactions(params?: {
  type?: 'all' | TransactionKind;
  page?: number;
  limit?: number;
}) {
  const { data } = await apiClient.get<{ data: TransactionRow[]; meta: TransactionsMeta }>(
    '/api/admin/finance/transactions',
    { params },
  );
  return data;
}

export async function approveDeposit(id: string) {
  await apiClient.post(`/api/admin/finance/deposits/${id}/approve`);
}

export async function rejectDeposit(id: string, reason: string) {
  await apiClient.post(`/api/admin/finance/deposits/${id}/reject`, { reason });
}

export async function approveWithdrawal(id: string) {
  await apiClient.post(`/api/admin/finance/withdrawals/${id}/approve`);
}

export async function rejectWithdrawal(id: string, reason: string) {
  await apiClient.post(`/api/admin/finance/withdrawals/${id}/reject`, { reason });
}

export async function listStakedLeaguesAdmin(params?: { page?: number; limit?: number }) {
  const { data } = await apiClient.get('/api/admin/finance/payouts/leagues', { params });
  return data;
}

export async function previewPayout(leagueId: string): Promise<PayoutPreviewResponse> {
  const { data } = await apiClient.get<PayoutPreviewResponse>(
    `/api/admin/finance/payouts/${leagueId}/preview`,
  );
  return data;
}

export async function commitPayout(leagueId: string, previewToken: string, reason: string) {
  await apiClient.post(`/api/admin/finance/payouts/${leagueId}/commit`, {
    previewToken,
    reason,
  });
}

export async function freezeLeaguePayout(leagueId: string, reason: string) {
  await apiClient.post(`/api/admin/finance/disputes/${leagueId}/freeze`, { reason });
}

export async function getCommissionDashboard() {
  const { data } = await apiClient.get<{
    commissionTotalMinor: number;
    reconciliation: { total: number; mismatches: unknown[] };
  }>('/api/admin/finance/commission');
  return data;
}

export async function runReconciliation() {
  const { data } = await apiClient.post('/api/admin/finance/reconciliation/run');
  return data;
}
