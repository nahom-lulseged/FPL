import { env } from '../../../config/env';
import { mockProvider } from './mock.provider';
import { telebirrProvider } from './telebirr.provider';
import type { PaymentProvider } from './providerInterface';

const providers: Record<string, PaymentProvider> = {
  mock: mockProvider,
  telebirr: telebirrProvider,
};

export function getPaymentProvider(): PaymentProvider {
  const provider = providers[env.PAYMENT_PROVIDER];
  if (!provider) {
    throw new Error(`Payment provider ${env.PAYMENT_PROVIDER} is configured but not implemented`);
  }
  return provider;
}
