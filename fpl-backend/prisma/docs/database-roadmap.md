# Database Roadmap — FPL Clone

**Stack in use:** PostgreSQL (Neon serverless), Prisma ORM, Redis (cache + pub/sub + job queues via BullMQ).

> This roadmap tracks the database layer specifically — schema evolution, migrations, indexing, and operational concerns — as a companion to `backend-roadmap.md`, since most schema changes are driven by backend feature phases. Phases below are numbered to match the backend roadmap they correspond to.

---

## Phase 0 — Core Schema Design (matches Backend Phase 0)

> Closed retroactively: schema and migrations pre-existed; Phase 0 completed via [`erd.md`](erd.md), [`decisions.md`](decisions.md), and `DIRECT_URL` wiring in `schema.prisma`.

- [x] Design entity-relationship diagram — see [`erd.md`](erd.md) (19 models from live `schema.prisma`)
- [x] Decide primary key strategy — documented in [`decisions.md`](decisions.md): `cuid()` on all models; `fplId` / `number` for FPL API sync
- [x] Decide on soft-delete vs hard-delete — documented in [`decisions.md`](decisions.md): hard delete everywhere; `isSuspended` / `isManualOverride` / `AuditLog` for retention
- [x] Set up Prisma, initial `schema.prisma`, first migration — `20260701142400_init` + 11 follow-up migrations
- [x] Set up Neon project + connection pooling — `DATABASE_URL` (pooled) for app; `directUrl = env("DIRECT_URL")` for migrations

## Phase 1 — Auth Tables (matches Backend Phase 1)

> Closed retroactively: User model and auth migrations pre-existed; see [`decisions.md`](decisions.md) § Auth tables.

- [x] `User` table — implemented as `displayName` + `role` enum (not `name`/`isAdmin`); see [`decisions.md`](decisions.md)
- [x] `isSuspended`, `suspendedAt`, `suspendedReason` — migration `20260702172043_add_user_suspend_and_audit_log`
- [x] `twoFactorEnabled`, `totpSecret` — migration `20260704123658_add_admin_2fa`
- [x] Refresh tokens in Redis only — documented in [`decisions.md`](decisions.md); implemented in `auth.service.ts` and `adminAuth.service.ts`
- [x] Unique constraint + index on `email` — `@unique` → Postgres `User_email_key`

## Phase 2 — Reference Data Tables (matches Backend Phase 2)

> Closed retroactively: reference models and ingestion pre-existed; see [`decisions.md`](decisions.md) § Reference data tables.

- [x] `RealTeam` — `fplId`, name, shortName, crestUrl; no strength columns (FDR on `Fixture`)
- [x] `Player` — `fplId`, position, realTeamId, price, isAvailable/injuryNote, isManualOverride
- [x] `Fixture` — gameweekId, home/away team FKs, kickoff, difficulties, isPostponed (+ scores/finished)
- [x] `Gameweek` — number, deadline, status enum, isCurrent (+ isManualOverride)
- [x] `PlayerGameweekStats` — full scoring fields; unique `(playerId, gameweekId)`
- [x] `SyncLog` — migration `20260702165615`; used by `ingestion.syncLog.ts`
- [x] Indexes — `Player.realTeamId`/`position`, `Fixture.gameweekId`, `PlayerGameweekStats.gameweekId` (+ extras in decisions.md)

## Phase 3 — Squad Tables (matches Backend Phase 3)

> Closed retroactively: Team/Squad and squadValidator pre-existed; see [`decisions.md`](decisions.md) § Squad tables.

- [x] `Team` — userId FK, `@@unique([userId, season])`, bankBalance, createdAt (+ name, squadValue, totalPoints, freeTransfers)
- [x] `Squad` — isStarter/benchOrder (not isStarting/benchPosition), captain flags; unique `(teamId, playerId)`
- [x] FPL rules in application layer — `squadValidator.ts` (not DB CHECK constraints)
- [x] Team delete cascades Squad rows — `onDelete: Cascade` on `Squad.teamId`

## Phase 4 — Scoring Tables (matches Backend Phase 4)

> Closed retroactively: scoring tables and engine pre-existed (`SquadGameweekSnapshot` + `TeamGameweekScore` in migration `20260701160802`); see [`decisions.md`](decisions.md) § Scoring tables.

- [x] Cached `TeamGameweekScore` (derived, not live-recalculated on read) — no `computedAt`; uses upsert + `breakdown` JSON
- [x] Scoring engine job upserts scores — `scoring.job.ts`; unique `(teamId, gameweekId)`
- [x] `RecalculationLog` — migration `20260703153000`; admin recalc/correction via `admin/scoring.service.ts`
- [x] `AuditLog` for scoring corrections — `logAdminAction` with `beforeJson`/`afterJson` on commit

## Phase 5 — Transfer Tables (matches Backend Phase 5)

> Closed retroactively: Transfer model and free-transfer flow pre-existed; see [`decisions.md`](decisions.md) § Transfer tables.

- [x] `Transfer` — teamId, playerIn/Out, gameweekId, `pricePaid` (not `pointsCost`); createdAt
- [x] Indexes on `teamId`, `gameweekId`, composite `(teamId, gameweekId)`
- [x] `Team.freeTransfers` — stored counter; rollover via `transfers.rollover.ts` + gameweek job

## Phase 6 — Chip Tables (matches Backend Phase 6)

> Closed retroactively: ChipUsage and chip rules pre-existed; see [`decisions.md`](decisions.md) § Chip tables.

- [x] `ChipUsage` — teamId, chipType, gameweekNumber+season (not gameweekId FK), usedAt, squadBackup
- [x] Unique once-per-season per chip — `@@unique([teamId, chipType, season, wildcardNumber])`; Wildcard ×2 via wildcardNumber

## Phase 7 — League Tables (matches Backend Phase 7)

> Closed retroactively for classic leagues; see [`decisions.md`](decisions.md) § League tables.

- [x] `League` — name, type, adminUserId (not creatorId FK), inviteCode, season, createdAt
- [x] `LeagueMembership` — leagueId, userId, teamId, joinedAt; unique (leagueId, userId) and (leagueId, teamId)
- [ ] `H2HFixture` — **Deferred** — HEAD_TO_HEAD enum exists but league creation blocked in `leagues.rules.ts`; classic leagues fully implemented
- [x] Index `LeagueMembership.leagueId` (+ `userId` for user's league list)

## Phase 8 — Admin & Audit Tables (matches Admin Phases 3–9)

> Closed retroactively: `AuditLog` + `AlertConfig` pre-existed; see [`decisions.md`](decisions.md) § Admin & audit tables.

- [x] `AuditLog` — migrations `20260702172043`, `20260705094753` (composite `(adminId, createdAt)` index); `logAdminAction` in all admin mutators
- [x] `AlertConfig` — migration `20260703200000`; `AlertType` enum + Phase 7 webhook delivery via `alert.service.ts`
- [ ] Partitioning/archival — **Deferred** (strategy documented in [`decisions.md`](decisions.md); implement when multi-season volume warrants it)

## Phase 9 — Indexing & Query Performance

> Closed retroactively: partial indexes in `20260702190000`; composite + docs in `20260705101027`. See [`decisions.md`](decisions.md) § Query performance.

- [x] Performance indexes — migration `20260702190000` (+ pg_trgm GIN on `Player.name`)
- [x] Composite `Player(position, price)` — migration `20260705101027`
- [x] EXPLAIN ANALYZE baseline — [`prisma/scripts/explain-hot-paths.sql`](../scripts/explain-hot-paths.sql) + `npm run db:explain`
- [x] N+1 / include audit — documented in [`decisions.md`](decisions.md); transfer history resolves `gameweekId` before filter
- [x] `pg_stat_statements` — Neon ops steps in [`database-structure.md`](database-structure.md) § Production query monitoring

## Phase 10 — Backup, Migrations & Operational Practices

> Closed retroactively: pooling/direct URLs from Phase 0; ops runbooks in [`ops-*.md`](ops-backup-restore.md).

- [x] Neon backup / PITR — checklist + restore drill in [`ops-backup-restore.md`](ops-backup-restore.md)
- [x] Migration discipline — [`decisions.md`](decisions.md) § Migrations discipline + `prisma:migrate:deploy` script
- [x] `DATABASE_URL` / `DIRECT_URL` — Phase 0 ([`schema.prisma`](../schema.prisma) + [`.env.example`](../../.env.example))
- [x] Secrets rotation — [`ops-secrets.md`](ops-secrets.md) checklist (manual Neon/host rotation)
- [x] Staging Neon branch — [`ops-environments.md`](ops-environments.md) workflow + [`.env.staging.example`](../../.env.staging.example)
- [x] Migration rollback plan — [`decisions.md`](decisions.md) § Migration rollback

---

## Suggested build order priority
Follow the backend roadmap phase-for-phase — the database schema should never get ahead of the feature that needs it. The two exceptions worth doing early regardless: **connection pooling setup (Phase 0)** and **audit logging schema (Phase 8, but create the table early)** since retrofitting audit logging onto existing mutating routes is more error-prone than building it in from the start.

---

## Phase 11 — Cache Sync Layer: Redis ↔ React Query (cross-cutting, build alongside Phases 4-8)

This phase formalizes how the two caching layers in this stack talk to each other. **Redis** is the backend's shared cache (same data for every user, survives across requests/servers). **React Query** is each browser's local cache (per-user, lives in memory, gone on refresh). They solve different problems and need a clear handoff so the frontend never shows stale data after a backend write.

### The pattern, in one sentence
**Every mutation that changes cached data must invalidate Redis first, then tell the frontend to invalidate React Query** — either via the mutation's own response (frontend invalidates its own query keys immediately) or via a WebSocket event (for changes triggered by something other than the user's own action, like live scoring or another admin's correction).

### 11.1 — Define the cache-aside pattern in Redis
- [x] Standard read path for any cached resource (players list, fixtures, league standings):
  1. Check Redis for the key (e.g. `players:list:{filterHash}`)
  2. On hit → return cached JSON
  3. On miss → query Postgres, write result to Redis with a TTL, return it
- [x] Standard write path for any mutation affecting cached data:
  1. Write to Postgres (source of truth)
  2. Delete (not update) the relevant Redis key(s) — invalidate, don't try to patch the cache in place
  3. Return the fresh data in the mutation's HTTP response so the frontend doesn't even need a second round-trip

### 11.2 — Define cache key naming convention (see database-structure.md §5 for the full table)
- [x] Namespace keys by resource + filter signature: `players:list:{hash}`, `standings:{leagueId}:{filterHash}`, `fixtures:list:{filterHash}`
- [x] Keep TTLs proportional to how often data actually changes: player list ~5 min, fixtures ~15 min, league standings ~30-60s during live gameweeks (short, because users refresh-check standings constantly during matches)

### 11.3 — Wire React Query invalidation to match
- [x] Mirror backend cache keys with **React Query query keys** on the frontend — e.g. Redis key `standings:{leagueId}:{filterHash}` maps to React Query key `['leagueStandings', leagueId]`. Keeping these conceptually aligned (even though they're different systems) makes it trivial to reason about "what needs to refresh when X happens."
- [x] Every mutation hook (`useCreateTeam`, `useSetLineup`, `useProcessTransfer`, `useSetCaptain`) calls `queryClient.invalidateQueries()` for the exact keys affected by that action **immediately after the mutation resolves** — this is the "frontend invalidates itself" half of the pattern, no server push needed for user-initiated actions.
- [x] Use React Query's `onMutate` for optimistic updates only where the UI benefit is clear (transfers, captain selection) — always pair optimistic updates with `onError` rollback logic.

### 11.4 — WebSocket-driven invalidation (for changes NOT caused by the viewing user)
- [x] When the scoring engine finalizes a gameweek, or an admin issues a points correction, or another league member's transfer changes standings — these are backend-driven events with no frontend mutation to hook into.
- [x] Backend: after invalidating the Redis key, also emit a Socket.IO event scoped to the relevant room (e.g. `league:{leagueId}` room, or `gw:{gameweekNumber}` room).
- [x] Frontend: a single `useLiveScores`-style hook listens for these events and calls `queryClient.invalidateQueries()` for the matching key — same invalidation call as the mutation-hook path, just triggered by a socket event instead of a local mutation.
- [x] This means there is exactly **one way** invalidation ever happens on the frontend (`queryClient.invalidateQueries` with a specific key) regardless of whether the trigger was the user's own click or a server-pushed event — worth enforcing as a pattern so the codebase doesn't grow two divergent cache-refresh mechanisms.

### 11.5 — Testing the sync layer
- [x] Integration test: perform a mutation, confirm the Redis key is deleted (not just changed) afterward
- [x] Integration test: confirm the WebSocket event fires with the correct room/payload after a backend-driven change (scoring finalization, admin correction)
- [x] Manual test: open the same league standings page in two browser tabs as different users, trigger a transfer in one, confirm the other tab's standings update without a manual refresh within the live-gameweek TTL window

### Suggested build order for this phase
Build the Redis cache-aside pattern (11.1-11.2) as soon as you have your first genuinely hot read path (likely player list in Backend Phase 2). Wire React Query invalidation (11.3) as soon as the first mutation exists (squad creation, Backend Phase 3). Add the WebSocket half (11.4) only once you reach Backend Phase 8 (Live Updates) — don't build the socket plumbing before there's a real backend-driven event to push.
