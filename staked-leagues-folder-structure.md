# Staked Leagues Folder Structure — FPL Clone

Additions to the existing `fpl-backend/`, `fpl-frontend/`, and `fpl-admin-frontend/` — no new top-level app needed, this extends the existing three.

---

## Part 1 — `fpl-backend/` additions

```
fpl-backend/
├── prisma/
│   └── schema.prisma                     # add: Wallet, LedgerEntry, Deposit,
│                                          # Withdrawal, StakePayout models;
│                                          # extend League with stakeAmount,
│                                          # isPrivate, potTotal, payoutStatus,
│                                          # payoutSplitConfig (jsonb snapshot)
│
├── src/
│   ├── modules/
│   │   ├── wallet/
│   │   │   ├── wallet.controller.ts       # GET /api/wallet, GET /api/wallet/ledger
│   │   │   ├── wallet.service.ts          # balance reads, reconciliation check
│   │   │   ├── wallet.routes.ts
│   │   │   └── ledger.service.ts          # core double-entry ledger engine —
│   │   │                                  # the single place balanced entries
│   │   │                                  # are ever created
│   │   │
│   │   ├── payments/
│   │   │   ├── deposits.controller.ts     # POST /api/payments/deposit
│   │   │   ├── deposits.service.ts
│   │   │   ├── withdrawals.controller.ts  # POST /api/payments/withdraw
│   │   │   ├── withdrawals.service.ts
│   │   │   ├── webhooks.controller.ts     # POST /api/payments/webhook/:provider
│   │   │   ├── webhooks.service.ts        # signature verification + idempotent
│   │   │   │                              # processing per provider
│   │   │   ├── providers/
│   │   │   │   ├── chapa.provider.ts      # (or whichever provider is chosen)
│   │   │   │   ├── santimpay.provider.ts
│   │   │   │   └── providerInterface.ts   # common interface so providers are
│   │   │   │                              # swappable without touching callers
│   │   │   └── payments.routes.ts
│   │   │
│   │   ├── staked-leagues/
│   │   │   ├── stakedLeagues.controller.ts # extends existing leagues module —
│   │   │   │                               # create/join with stake, list public
│   │   │   │                               # staked leagues
│   │   │   ├── stakedLeagues.service.ts
│   │   │   ├── stakeCommitment.service.ts  # atomic join+stake-hold transaction,
│   │   │   │                               # row-locking for concurrent joins
│   │   │   ├── payoutCalculator.service.ts # reads standings, computes splits,
│   │   │   │                               # preview + commit two-step
│   │   │   └── stakedLeagues.routes.ts
│   │   │
│   │   ├── kyc/
│   │   │   ├── kyc.controller.ts           # submit verification doc/info
│   │   │   ├── kyc.service.ts
│   │   │   └── kyc.routes.ts
│   │   │
│   │   └── admin/
│   │       └── finance/                    # extends existing admin module
│   │           ├── adminWallet.controller.ts    # search/view any user's wallet
│   │           ├── adminWithdrawals.controller.ts # approval queue
│   │           ├── adminPayouts.controller.ts     # trigger/review payout preview
│   │           ├── adminDisputes.controller.ts    # freeze/resolve/manual adjust
│   │           ├── adminFinance.service.ts
│   │           └── adminFinance.routes.ts
│   │
│   ├── middleware/
│   │   ├── kycGuard.ts                     # blocks withdrawal routes until
│   │   │                                   # kycVerifiedAt is set
│   │   ├── financeRateLimiter.ts           # stricter limits on deposit/
│   │   │                                   # withdraw/stake-commit endpoints
│   │   └── webhookSignatureVerifier.ts     # generic verifier, provider-specific
│   │                                       # logic delegated to each provider
│   │
│   ├── jobs/
│   │   ├── reconciliation.job.ts           # scheduled job: sum(LedgerEntry) per
│   │   │                                   # wallet == Wallet.balance, alert on
│   │   │                                   # mismatch
│   │   ├── payoutDistribution.job.ts       # triggered post-admin-approval, not
│   │   │                                   # fully automatic (see roadmap Phase 4)
│   │   └── fraudDetection.job.ts           # flags suspicious patterns for
│   │                                       # admin review
│   │
│   └── lib/
│       └── money.ts                        # currency-safe arithmetic helpers —
│                                            # never use floating point for money;
│                                            # use integer minor units (cents/
│                                            # santim) throughout
│
├── tests/
│   ├── unit/
│   │   ├── ledger.service.test.ts          # balanced-entry invariant tests
│   │   ├── payoutCalculator.test.ts
│   │   └── money.test.ts
│   └── integration/
│       ├── deposit-flow.test.ts
│       ├── stake-commitment-concurrency.test.ts  # simulated race conditions
│       ├── payout-distribution.test.ts
│       └── withdrawal-flow.test.ts
```

---

## Part 2 — `fpl-frontend/` additions

```
fpl-frontend/
├── src/
│   ├── api/
│   │   ├── wallet.api.ts
│   │   ├── payments.api.ts
│   │   └── stakedLeagues.api.ts
│   │
│   ├── hooks/
│   │   ├── useWallet.ts
│   │   ├── useLedgerHistory.ts
│   │   └── useStakedLeagues.ts
│   │
│   ├── pages/
│   │   ├── wallet/
│   │   │   ├── WalletPage.tsx              # balance, deposit/withdraw buttons,
│   │   │   │                               # transaction history
│   │   │   └── KycVerificationPage.tsx
│   │   └── leagues/
│   │       ├── CreateStakedLeaguePage.tsx  # extends existing league creation
│   │       └── StakedLeagueDetailPage.tsx  # pot, payout structure, status
│   │
│   └── components/
│       ├── wallet/
│       │   ├── BalanceCard.tsx
│       │   ├── DepositModal.tsx
│       │   ├── WithdrawModal.tsx
│       │   └── LedgerHistoryTable.tsx
│       └── leagues/
│           ├── StakeAmountInput.tsx
│           ├── JoinStakeConfirmDialog.tsx  # explicit confirm-before-charge UI
│           └── PayoutStructureBadge.tsx    # "1st: 50% · 2nd: 30% · 3rd: 20%"
```

---

## Part 3 — `fpl-admin-frontend/` additions

```
fpl-admin-frontend/
├── src/
│   ├── api/
│   │   └── adminFinance.api.ts
│   │
│   ├── pages/
│   │   └── finance/
│   │       ├── WalletLookupPage.tsx        # search any user, view ledger
│   │       ├── WithdrawalQueuePage.tsx     # pending approvals
│   │       ├── PayoutReviewPage.tsx        # preview-before-commit UI
│   │       ├── DisputeResolutionPage.tsx
│   │       └── CommissionDashboardPage.tsx
│   │
│   └── components/
│       └── finance/
│           ├── LedgerTable.tsx
│           ├── PayoutPreviewDiff.tsx       # reuses JsonDiffViewer.tsx pattern
│           │                               # from admin-folder-structure.md
│           └── ReconciliationStatusBadge.tsx
```

---

## Key structural notes

- **`ledger.service.ts` is the single choke point** for every balance-affecting operation in the entire backend — no other service should ever write to `LedgerEntry` directly. This is the most important architectural rule in this whole module.
- **`money.ts`** exists specifically to prevent floating-point currency bugs — store and compute all amounts as integers in the currency's minor unit (e.g. santim if ETB has one, or whatever smallest unit your payment provider uses), convert to display format only at the UI layer.
- **`providerInterface.ts`** keeps your payment gateway swappable — if you ever need to add a second provider or switch providers, callers (`deposits.service.ts`, `withdrawals.service.ts`) shouldn't need to change.
- **Admin finance routes reuse the existing `adminGuard` and `auditLog.service.ts`** from your Admin Phase 9 work — every mutating finance action (approve withdrawal, commit payout, manual adjustment) must go through the same audit logging discipline already established there, no exceptions.
