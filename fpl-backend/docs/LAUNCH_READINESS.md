# Staked Leagues — Launch Readiness

## Pre-launch checklist

- [ ] Legal sign-off on terms of service and payout disclosures
- [ ] `MAX_STAKE_MINOR` set conservatively for soft launch (see `.env.example`)
- [ ] `PAYMENT_PROVIDER` switched from `mock` to live provider after sandbox E2E
- [ ] `PAYMENT_WEBHOOK_SECRET` configured per provider
- [ ] Reconciliation job enabled (`RECONCILIATION_CRON`) with `LEDGER_MISMATCH` alert webhook
- [ ] Fraud detection job enabled (`FRAUD_DETECTION_CRON`)
- [ ] In-app support path: `SUPPORT_CONTACT_EMAIL` shown on wallet and dispute flows
- [ ] Run `npm run prisma:generate`, then synchronize the MongoDB schema with `npm run prisma:push`
- [ ] Run the application's MongoDB index synchronization on startup and confirm sparse indexes in the startup logs
- [ ] Run full test suite including `ledger.service.test.ts`

## Monitoring

- Ledger reconciliation runs on schedule via BullMQ (`reconciliation` queue)
- Mismatches trigger `LEDGER_MISMATCH` admin alert
- Commission dashboard at `/finance/commission` for accounting export

## Soft launch

1. Enable staked leagues for a small known user group
2. Keep `MAX_STAKE_MINOR` low initially
3. Manual withdrawal approval required (default)
4. Payout distribution requires admin preview + commit (no auto-distribute)
