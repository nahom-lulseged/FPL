import { env } from './env';

/** Platform-wide finance limits and commission — enforced server-side. */
export const platformConfig = {
  currency: env.FINANCE_CURRENCY,
  maxStakeMinor: env.MAX_STAKE_MINOR,
  maxPotMinor: env.MAX_POT_MINOR,
  platformCommissionBps: env.PLATFORM_COMMISSION_BPS,
  termsVersion: env.FINANCE_TERMS_VERSION,
  supportContactEmail: env.SUPPORT_CONTACT_EMAIL,
} as const;

export const DEFAULT_PAYOUT_SPLIT = {
  // Rank bps are of the pot *after* platform fee.
  // With platform 10%: pot shares ≈ 45% / 25% / 20% (+ 10% platform).
  ranks: [
    { place: 1, percentBps: 5000 },
    { place: 2, percentBps: 2778 },
    { place: 3, percentBps: 2222 },
  ],
  platformPercentBps: env.PLATFORM_COMMISSION_BPS,
  termsVersion: env.FINANCE_TERMS_VERSION,
} as const;
