import { env } from '../../../config/env';
import type {
  InitiateDepositInput,
  InitiateDepositResult,
  InitiatePayoutInput,
  InitiatePayoutResult,
  PaymentProvider,
  WebhookPayload,
} from './providerInterface';

export const mockProvider: PaymentProvider = {
  name: 'mock',

  async initiateDeposit(input: InitiateDepositInput): Promise<InitiateDepositResult> {
    const providerRef = `mock_dep_${input.depositId}`;
    const baseUrl = `http://localhost:${env.PORT}`;
    return {
      providerRef,
      redirectUrl: `${baseUrl}/api/payments/mock/complete?ref=${providerRef}&depositId=${input.depositId}`,
    };
  },

  async initiatePayout(input: InitiatePayoutInput): Promise<InitiatePayoutResult> {
    return {
      providerRef: `mock_wd_${input.withdrawalId}`,
      status: 'COMPLETED',
    };
  },

  verifyWebhook(payload: WebhookPayload): boolean {
    return payload.signature === env.PAYMENT_WEBHOOK_SECRET;
  },

  parseWebhook(rawBody: string) {
    const data = JSON.parse(rawBody) as {
      providerRef: string;
      amountMinor: number;
      status: 'COMPLETED' | 'FAILED';
    };
    return {
      providerRef: data.providerRef,
      amountMinor: data.amountMinor,
      status: data.status,
    };
  },
};
