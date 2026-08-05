# Backend Rules — fpl
(Non-negotiable guardrails.)

## Security & Trust Boundary
1. **Never trust client input.** Every mutating endpoint validates via
   DTO/schema before touching the database or business logic.
2. **Server is the sole authority for rules-critical state**: budget
   totals, deadline locks, chip usage counts, transfer costs, scoring.
   The client may render optimistically but must always reconcile with
   server responses.
3. **Object-level authorization on every resource fetch/mutation** —
   confirm the requesting user owns or is permitted to access the squad/
   league/transfer in question. No "trust the ID in the URL."
4. **No secrets in code or version control.** Environment variables /
   secret manager only. `.env.example` committed, `.env` never.
5. **Passwords hashed (argon2/bcrypt), refresh tokens stored as hashes**,
   never plaintext, never logged.

## Data Integrity
6. **All schema changes via Prisma migrations**, reviewed, checked into
   git. No manual production DB edits.
7. **Idempotency required** for any job that can be retried or re-run
   (scoring recompute, price changes, notification sends) — re-running
   must not double-apply effects.
8. **Immutable audit trail** for transfers, chip usage, and price
   changes — these are append-only logs, never overwritten.
9. **Money/points values use integers or fixed-point decimals** — never
   floating point for budget or points arithmetic.

## Architecture
10. **Heavy computation never runs synchronously in a request handler.**
    Scoring recomputation, price-change batch jobs, and notification
    fan-out are always queued (BullMQ) and processed by workers.
11. **Business rules (scoring table, transfer cost formula, squad
    quotas) live in one configurable, documented place** — not
    duplicated or hardcoded across multiple controllers/services.
12. **Consistent error contract**: every error response includes a
    machine-readable `errorCode` plus a human-readable `message`. Never
    leak stack traces or internal details to the client in production.

## Testing & Review
13. No merge without passing unit tests for any changed business logic,
    especially scoring, validation, and transfer-cost calculations.
14. Scoring engine changes require golden-file/regression tests
    demonstrating the exact expected output for a documented scenario
    matrix before merge.
15. Any endpoint touching money-equivalent values (budget, prize
    leagues if implemented) requires an explicit second reviewer
    sign-off in the PR description (self-noted if solo dev/agent).

## Scope & Documentation
16. Update `roadmap.md`'s changelog when a structural decision is made
    (e.g. data source choice, scoring rule version pinned).
17. Every new public endpoint is reflected in the OpenAPI/Swagger spec
    in the same PR that introduces it — docs and code do not drift.
18. Do not silently expand scope beyond the current roadmap phase;
    flag cross-phase dependencies instead of building ahead.

## Rate Limiting & Abuse Prevention
19. Auth endpoints, and any endpoint that could be scripted for abuse
    (league-join spam, transfer spam), must have rate limiting.
20. Any integration with an external data source (official FPL API or
    otherwise) must respect that source's rate limits/ToS and cache
    aggressively — never hammer an upstream on every request.