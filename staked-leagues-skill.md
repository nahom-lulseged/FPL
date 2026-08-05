# Staked Leagues Skill Map — FPL Clone

This module has a fundamentally different risk profile than the rest of the app — bugs here move real money, not just display incorrect points. Treat every skill below with more rigor than the equivalent skill elsewhere in the project.

## Core Financial Engineering Concepts (the most important section in this file)
- **Double-entry ledger accounting**: understanding why every money movement must be recorded as a balanced pair of entries (a debit and a credit that sum to zero) rather than a simple balance increment/decrement. This is *the* foundational skill for this module — get comfortable with it before writing any ledger code, not while writing it.
- **Idempotency**: designing every payment-affecting operation (webhook handlers, payout distribution, deposit confirmation) so that processing the same request/event twice produces the same result as processing it once. Payment providers *will* redeliver webhooks; your system must not care.
- **Eventual consistency vs strong consistency trade-offs**: deciding which operations must be synchronous and atomic (stake commitment on league join — must not partially succeed) vs which can be asynchronous (payment provider confirmation arriving via webhook after an initial "pending" state)
- **Reconciliation**: building and running a routine check that a cached/denormalized balance always matches the sum of underlying ledger entries — and treating any mismatch as a P0 incident, not a minor bug

## Payment Gateway Integration
- **Webhook handling and signature verification**: every payment provider signs its webhook payloads — learn your chosen provider's (Chapa/SantimPay/ArifPay) specific verification method and never process an unverified webhook
- **Sandbox-first development discipline**: building and fully testing the entire flow against a provider's test/sandbox environment before touching production credentials — a mistake made against a live payment endpoint costs real money
- **Handling provider failure states gracefully**: timeouts, declined payments, partial failures — the UI and backend both need a clear "pending" state distinct from "failed" and "succeeded," since payment confirmation is often asynchronous

## Database & Transaction Skills
- **Postgres transactions for financial correctness**: using `BEGIN`/`COMMIT` (or Prisma's `$transaction`) so that a stake commitment and its corresponding league membership either both succeed or both fail — no partial states
- **Row-level locking / handling race conditions**: two users joining the last available spot in a staked league at the same moment — understanding `SELECT ... FOR UPDATE` or equivalent optimistic-locking patterns to prevent double-booking a stake pool
- **Polymorphic references in a ledger table** (`referenceType`/`referenceId` pointing at different source tables) — a common pattern for keeping one unified ledger while it represents many different kinds of events

## Security Specific to Financial Features
- **KYC/AML pattern recognition**: understanding at a basic level what "know your customer" and "anti-money-laundering" checks are trying to catch (identity fraud, structuring/smurfing, using the platform to move illicit funds) so you can reason about why certain limits and verification gates exist, not just implement them mechanically
- **Fraud pattern detection**: recognizing suspicious usage patterns (rapid deposit-withdraw cycles, repeated stake pools between the same small group of accounts) — doesn't require building a full ML fraud system for v1, but does require knowing what to log and flag for manual review
- **Stricter rate limiting and monitoring** on every money-touching endpoint compared to the rest of the app

## Admin Tooling for Financial Operations
- **Building a "preview before commit" pattern for irreversible actions** — you already have this pattern from Admin Phase 5 (scoring corrections); apply the same discipline here for payout distribution, since undoing a real payout is far harder than undoing a points correction
- **Designing dispute-resolution workflows**: freezing a league's payout status, recording investigation notes, and performing an audited manual ledger adjustment when genuinely necessary — while keeping manual adjustments rare and heavily logged, not a routine tool

## Compliance-Adjacent Skills (non-legal, but engineering-relevant)
- Understanding **why terms-of-service acceptance and age verification must be enforced at the API level**, not just shown as a UI checkbox that can be bypassed by calling the endpoint directly
- Knowing how to **version and timestamp legal disclosures** (payout percentages, commission rates) shown to a user at the moment they commit a stake, so you can prove what they agreed to if a dispute arises later — store a snapshot of the terms/percentages with the league at creation time, don't just reference a "current" value that could change later

## Testing Discipline (higher bar than the rest of the codebase)
- **Property-based / invariant testing**: instead of just testing specific scenarios, testing an invariant that must always hold (e.g. "sum of all ledger entries for a wallet always equals the cached balance") across many randomized operation sequences
- **Concurrency testing**: deliberately simulating simultaneous requests to catch race conditions before they reach production
- Recognizing that for this module specifically, **test coverage expectations are higher than for the rest of the app** — a missed edge case in the scoring engine shows a wrong number; a missed edge case here can mean lost or duplicated real money

## Recommended learning order
1. Double-entry ledger fundamentals — read a couple of good explainers on how basic bookkeeping/accounting ledgers work before writing the schema; this is worth more than diving straight into Prisma models
2. Idempotency patterns — understand the concept generally before integrating any real payment provider
3. Your chosen provider's specific API docs (Chapa/SantimPay/ArifPay) — webhook format, signature verification, sandbox setup
4. Postgres transactions and row-locking — needed the moment you build the stake-commitment-on-join flow
5. Fraud/KYC pattern awareness — needed before Phase 6 admin tooling and Phase 7 security pass
6. Concurrency/property-based testing — apply throughout Phase 8, don't leave it until the end
