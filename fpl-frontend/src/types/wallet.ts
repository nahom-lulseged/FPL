export interface WalletSummary {
  id: string;
  balanceMinor: number;
  currency: string;
  balanceDisplay: string;
}

export interface LedgerEntry {
  id: string;
  amountMinor: number;
  direction: 'CREDIT' | 'DEBIT';
  entryType: string;
  referenceType: string;
  referenceId: string;
  description: string | null;
  createdAt: string;
}

export interface LedgerHistoryResponse {
  data: LedgerEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  balanceMinor: number;
}

export interface ComplianceStatus {
  termsAcceptedAt: string | null;
  ageVerifiedAt: string | null;
  kycVerifiedAt: string | null;
  kycDocumentRef: string | null;
  termsVersion: string;
  canStake: boolean;
  canWithdraw: boolean;
}

export interface DepositResponse {
  depositId: string;
  redirectUrl: string;
  amountMinor: number;
  status: string;
}

export interface WithdrawalResponse {
  id: string;
  amountMinor: number;
  status: string;
}
