import { apiClient } from '@/api/client';
import type { ComplianceStatus, DepositResponse, WithdrawalResponse } from '@/types/wallet';

export async function initiateDeposit(amountMajor: number): Promise<DepositResponse> {
  const { data } = await apiClient.post<DepositResponse>('/api/payments/deposit', {
    amountMajor,
  });
  return data;
}

export async function requestWithdrawal(amountMajor: number): Promise<WithdrawalResponse> {
  const { data } = await apiClient.post<WithdrawalResponse>('/api/payments/withdraw', {
    amountMajor,
  });
  return data;
}

export async function getComplianceStatus(): Promise<ComplianceStatus> {
  const { data } = await apiClient.get<ComplianceStatus>('/api/kyc/status');
  return data;
}

export async function acceptTerms(): Promise<void> {
  await apiClient.post('/api/kyc/terms/accept');
}

export async function verifyAge(): Promise<void> {
  await apiClient.post('/api/kyc/age/verify', { confirmed: true });
}

export async function submitKyc(documentRef: string): Promise<void> {
  await apiClient.post('/api/kyc/submit', { documentRef });
}
