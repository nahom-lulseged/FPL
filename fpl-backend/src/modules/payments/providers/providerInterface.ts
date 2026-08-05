export interface InitiateDepositInput {
  amountMinor: number;
  userId: string;
  depositId: string;
  email: string;
}

export interface InitiateDepositResult {
  redirectUrl: string;
  providerRef: string;
}

export interface InitiatePayoutInput {
  amountMinor: number;
  userId: string;
  withdrawalId: string;
  email: string;
}

export interface InitiatePayoutResult {
  providerRef: string;
  status: 'PENDING' | 'COMPLETED';
}

export interface WebhookPayload {
  providerRef: string;
  amountMinor: number;
  status: 'COMPLETED' | 'FAILED';
  rawBody: string;
  signature: string;
}

export interface PaymentProvider {
  name: string;
  initiateDeposit(input: InitiateDepositInput): Promise<InitiateDepositResult>;
  initiatePayout(input: InitiatePayoutInput): Promise<InitiatePayoutResult>;
  verifyWebhook(payload: WebhookPayload): boolean;
  parseWebhook(rawBody: string): Omit<WebhookPayload, 'rawBody' | 'signature'>;
}
