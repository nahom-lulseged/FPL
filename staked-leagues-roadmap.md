# Staked Leagues Roadmap — FPL Clone

**Feature summary:** Users create or join a league with a real-money entry stake. Public staked leagues appear in the league list with stake amount, current pot, and invite code; private staked leagues are invite-only and not listed. At season/period end, the top-ranked members split the pot by percentage; the platform retains a small commission.

**Assumed context:** You've confirmed legal clearance and licensing in Ethiopia for this activity. This roadmap builds the technical system assuming that compliance foundation is in place — it does not replace ongoing legal/compliance work (see §0 below, which stays live throughout, not just at the start).

**Stack additions:** A local Ethiopian payment gateway (Chapa, SantimPay, ArifPay, or Telebirr Business API — evaluate in Phase 0, don't assume one), a double-entry ledger table in Postgres, and the same Redis/React Query/audit-log patterns already established in the rest of the app.

---

## Phase 0 — Compliance & Payment Provider Foundation (ongoing, not just first)
- [ ] Confirm with your legal counsel which specific activities your license covers: peer-to-peer staked pools, platform-held escrow, commission percentage caps, age minimums, required disclosures
- [ ] Select a licensed Ethiopian payment gateway (Chapa, SantimPay, ArifPay are common options — compare their gambling/wagering use-case policies specifically, since general merchant terms often exclude this category even with a license; you may need a specific merchant category or direct agreement)
- [ ] Define KYC requirements: what identity verification is required before a user can deposit, withdraw, or receive a payout (phone verification via OTP is often a baseline in Ethiopia; identity document upload may be required above certain thresholds)
- [ ] Define age-verification and terms-of-service acceptance flow — must happen before any stake-related feature is accessible, not just at account signup
- [ ] Define dispute/refund policy in writing before building the dispute-resolution admin tooling in Phase 8
- [ ] Set a maximum stake amount and maximum pot size per league as a configurable platform-wide limit (protects against money-laundering-pattern abuse and matches typical licensing conditions)

## Phase 1 — Ledger & Wallet Foundation (Backend)
- [ ] Design a **double-entry ledger** — this is the single most important design decision in this feature. Every movement of money (deposit, stake commitment, payout, refund, commission) is recorded as a balanced pair of ledger entries, never as a simple balance update. This makes the system auditable and recoverable from bugs, which a simple `user.balance` field is not.
- [ ] `Wallet` table: userId (FK, unique), balance (derived/cached from ledger, recalculable), currency (ETB)
- [ ] `LedgerEntry` table: id, walletId (FK), amount, direction (CREDIT/DEBIT), type (DEPOSIT/STAKE_HOLD/STAKE_RELEASE/PAYOUT/COMMISSION/REFUND), referenceType, referenceId (polymorphic reference to the League/Payout/Deposit that caused this entry), createdAt, idempotencyKey (unique — see Phase 2)
- [ ] `Deposit` table: id, userId, amount, paymentProviderRef, status (PENDING/COMPLETED/FAILED), createdAt
- [ ] `Withdrawal` table: id, userId, amount, paymentProviderRef, status, kycVerifiedAt (nullable — block withdrawal until set), createdAt
- [ ] Wallet balance is always **computed by summing LedgerEntry rows** for reconciliation purposes, even if you cache a denormalized balance on `Wallet` for read performance (Redis cache-aside, same pattern as `database-roadmap.md` Phase 11) — the cache must never be the source of truth

## Phase 2 — Payment Gateway Integration
- [ ] Integrate chosen provider's deposit flow: initiate payment → redirect/webhook → provider confirms → credit wallet via a new balanced LedgerEntry pair
- [ ] **Idempotency is mandatory here**: payment webhooks can be delivered more than once by any provider — every webhook handler must check `idempotencyKey` (e.g. the provider's transaction ID) before creating ledger entries, and safely no-op on a duplicate delivery
- [ ] Withdrawal flow: user requests withdrawal → KYC check → admin approval queue (manual review recommended for early launch, given license conditions) → provider payout call → ledger entry on confirmed success
- [ ] Webhook signature verification for every provider callback — never trust an unsigned/unverified webhook body
- [ ] Sandbox/test-mode integration first — do not touch the provider's production/live endpoint until the full flow is tested end-to-end with fake money

## Phase 3 — Staked League Creation & Stake Commitment
- [ ] Extend `League` model: `stakeAmount` (nullable — null means a normal free league), `isPrivate` boolean (private = not listed in public league browser), `potTotal` (derived from committed stakes), `payoutStatus` (OPEN/LOCKED/DISTRIBUTED)
- [ ] League creation flow: creator sets stake amount, chooses public/private — if `stakeAmount` is set, creator's own stake is immediately committed (debited from wallet, held via a `STAKE_HOLD` ledger entry) as part of creation, not a separate step
- [ ] Join flow: joining a staked league requires sufficient wallet balance — commit the stake atomically with the `LeagueMembership` creation in a single Postgres transaction (join must fail cleanly if either the membership or the stake-hold fails, never partially succeed)
- [ ] Public league browser: list leagues where `isPrivate = false AND stakeAmount IS NOT NULL`, showing stake amount, current pot, member count, and an obfuscated/no invite code (join via a "Join" button + confirm-stake dialog, not by seeing the code publicly)
- [ ] Private staked leagues: never appear in the public browser; join only via invite code, same as your existing private league flow, but now requiring the stake-commitment step

## Phase 4 — Payout Calculation
- [ ] Define payout period: season-end only, or configurable (weekly) per the original idea — recommend **season-end only for v1** to reduce operational/compliance complexity around frequent payouts; add weekly as a v2 enhancement only after season-end payouts are proven reliable
- [ ] Payout percentage split for top 3 (or configurable N) ranks — store this as league configuration at creation time so it can't be changed after money is committed (fairness/compliance requirement)
- [ ] Platform commission percentage — deducted from the pot before distribution, stored as a platform-wide config value with an admin audit trail on any change
- [ ] Payout calculation service: reads final standings (reuses your existing league standings logic from Backend Phase 7), computes each winner's share, creates the balanced ledger entries (DEBIT the pot, CREDIT each winner's wallet, CREDIT platform's commission wallet) — all inside one transaction
- [ ] **Preview-before-commit pattern** (same as your Admin Phase 5 scoring corrections): compute and display the payout breakdown to an admin for review before actually moving any money — do not auto-distribute without a human confirmation step for at least the first several months of operation

## Phase 5 — Frontend: League Browser & Creation UI
- [ ] Extend the public leagues browser page with stake amount, pot size, and member count columns/cards for staked leagues (visually distinct from free leagues — e.g. a coin/currency badge)
- [ ] League creation form: stake amount input, public/private toggle, clear pre-commit confirmation showing "You will be charged ETB X to create this league" before submission
- [ ] Join flow: confirm-stake dialog showing exact amount, current wallet balance, and resulting balance after joining — require explicit confirmation, not a single accidental tap
- [ ] Wallet page: balance, deposit button (→ payment provider flow), withdrawal button (→ KYC-gated flow), transaction history (reads from `LedgerEntry`, human-readable descriptions per entry type)
- [ ] League detail page: show pot total, payout structure (e.g. "1st: 50%, 2nd: 30%, 3rd: 20%, platform: 10%"), and payout status (Open/Locked/Distributed) prominently

## Phase 6 — Admin Oversight (extends existing Admin Dashboard)
- [ ] Admin wallet/ledger viewer: search any user's wallet, view their full ledger history, reconcile balance against ledger sum (flag mismatches — this should never happen if Phase 1 is built correctly, but the tool must exist)
- [ ] Withdrawal approval queue: list pending withdrawals, KYC status per request, approve/reject with mandatory reason (writes to `AuditLog`, same pattern as existing admin actions)
- [ ] Staked league oversight: list all staked leagues, pot sizes, payout status; ability to manually trigger the payout-preview flow from Phase 4
- [ ] Dispute resolution tool: flag a league/payout for manual review, freeze its payout status, record resolution notes and any manual ledger adjustment (with mandatory reason + audit log — manual ledger adjustments are high-risk and should require a second admin's confirmation if your team ever grows beyond one admin)
- [ ] Platform commission dashboard: running total collected, exportable for accounting/tax purposes

## Phase 7 — Security & Fraud Prevention
- [ ] Rate-limit deposit/withdrawal endpoints more strictly than normal API routes
- [ ] Detect and flag suspicious patterns: rapid deposit-then-withdrawal (potential money laundering test), a user creating many small staked leagues with the same few counterparties repeatedly, unusually large stakes relative to platform norms
- [ ] Ensure the max-stake and max-pot limits from Phase 0 are enforced server-side, not just in the UI
- [ ] Full audit log on every ledger-affecting admin action (already a pattern from your Admin Phase 9 — extend it to cover this module specifically)
- [ ] Run `security-checklist.md` sections 1, 6, 7, 9 specifically against every new endpoint in this module before it goes live — financial endpoints deserve a second, dedicated pass beyond the standard checklist

## Phase 8 — Testing (unusually high bar for this module)
- [ ] Unit tests for the ledger service: every operation type produces correctly balanced entries, idempotency keys correctly prevent duplicate processing
- [ ] Integration tests: full deposit → join staked league → season ends → payout distributed → withdrawal flow, end to end
- [ ] Concurrency tests: two users joining the last spot in a staked league simultaneously, confirm no double-booking or lost stake
- [ ] Reconciliation test: after a batch of random operations, confirm `SUM(LedgerEntry.amount)` per wallet always equals the cached `Wallet.balance`
- [ ] Manual test of the full withdrawal flow against the payment provider's sandbox before ever enabling live withdrawals

## Phase 9 — Launch Readiness
- [ ] Legal sign-off on final terms of service and payout percentage disclosures shown to users at league creation
- [ ] Soft launch with a low max-stake limit and a small group of known users before opening broadly
- [ ] Monitoring/alerting on the ledger reconciliation check (Phase 8) running as a continuous scheduled job in production, not just a one-time test
- [ ] Clear in-app support/contact path for payment disputes

---

## Suggested build order priority
**Compliance/provider selection → Ledger foundation → Payment gateway integration (sandbox only) → Stake commitment on league join/create → Payout calculation with preview-before-commit → Admin oversight → Security/fraud pass → Heavy testing → Soft launch.** Do not skip ahead to the frontend polish (Phase 5) before the ledger (Phase 1) and idempotent payment handling (Phase 2) are solid — a bug in money-movement logic is categorically more expensive than a bug anywhere else in this entire project.
