# Payment Provider Evaluation Checklist

Use before enabling a live payment provider in production.

## Provider comparison

- [ ] Confirm merchant category supports peer-to-peer staked pools / wagering use case
- [ ] Compare Chapa, SantimPay, ArifPay, Telebirr Business API sandbox availability
- [ ] Document deposit redirect flow vs hosted checkout
- [ ] Document payout/withdrawal API and settlement timing
- [ ] Document webhook signature verification method per provider
- [ ] Document idempotency / transaction reference field for webhooks
- [ ] Obtain sandbox credentials and test deposit + payout end-to-end

## Legal / compliance (engineering gates)

- [ ] Max stake and max pot limits configured in env (`MAX_STAKE_MINOR`, `MAX_POT_MINOR`)
- [ ] Terms version tracked (`FINANCE_TERMS_VERSION`) and snapshotted on league creation
- [ ] Age verification enforced at API before stake endpoints
- [ ] KYC required before withdrawal (`kycGuard`)

## Integration

- [ ] Implement provider in `src/modules/payments/providers/<name>.provider.ts`
- [ ] Set `PAYMENT_PROVIDER` env var
- [ ] Configure `PAYMENT_WEBHOOK_SECRET` per provider docs
- [ ] Run full integration test suite against sandbox before production keys
