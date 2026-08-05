# Database Skill Map — FPL Clone

## Core (needed from day 1)
- **Relational modeling fundamentals**: primary keys, foreign keys, one-to-many vs many-to-many, when to use a join table (`Squad`, `LeagueMembership`)
- **PostgreSQL basics**: data types (especially `jsonb` for `AuditLog.beforeJson`/`afterJson`, enums for `chipType`/`position`/`leagueType`), constraints (`UNIQUE`, `NOT NULL`, composite unique indexes)
- **Prisma schema syntax**: models, relations (`@relation`), `@@unique`, `@@index`, enums, migrations workflow (`migrate dev` vs `migrate deploy`)

## Schema Design Judgment (Phase 0–3)
- Knowing **when to enforce a rule in the database vs the application layer** — this project leans heavily on app-layer validation (`squadValidator.ts`) because FPL's rules (budget totals, max-3-per-club) aren't expressible as simple DB constraints. Recognizing this trade-off is a real skill, not a shortcut.
- **Composite unique indexes**: e.g. `(teamId, playerId)` on `Squad`, `(leagueId, userId)` on `LeagueMembership` — prevents duplicate rows without extra application code
- **Cascade behavior**: understanding `onDelete: Cascade` vs `Restrict` vs `SetNull` and choosing correctly per relation (deleting a `User` should cascade to their `Team`, but probably not to `AuditLog` entries about them)

## Derived/Cached Data Patterns (Phase 4)
- Recognizing when to **store a computed value** (`TeamGameweekScore`) instead of calculating on every read — critical for anything hit on every page load (team points, league standings)
- Designing **idempotent recalculation jobs**: re-running a scoring job must produce the same result and not create duplicate rows (upsert on a unique key, e.g. `(teamId, gameweekId)`)

## Time-Series-ish Data (Phase 2, 8)
- Modeling append-heavy tables (`PlayerGameweekStats`, `AuditLog`) with growth in mind from the start
- Basic understanding of **table partitioning** (by season or gameweek range) for tables that will grow large over multiple seasons — not needed on day one, but good to know when it becomes necessary
- Archival strategy thinking: does old data need to stay queryable, or can it move to cold storage?

## Query Performance (Phase 9)
- **Reading `EXPLAIN ANALYZE` output**: spotting sequential scans that should be index scans
- **Composite indexing strategy**: matching index column order to actual query filter/sort patterns (e.g. `Player(position, price)` supports "filter by position, sort by price" efficiently; the reverse order doesn't)
- **N+1 query recognition**: knowing when a Prisma `include` chain is quietly issuing many small queries vs one efficient join
- **`pg_stat_statements`**: identifying your actual slowest queries in production rather than guessing

## Neon-Specific Operational Skills
- **Serverless connection pooling**: understanding why Neon's pooled connection string (PgBouncer-based) is needed for a normal app workload, and why migrations need the **direct** (unpooled) connection instead
- **Database branching**: Neon lets you branch a database like a git branch — useful for spinning up a staging environment or testing a risky migration without touching production data
- **Cold start awareness**: Neon's free/scale-to-zero tiers can have connection latency after idle periods — worth knowing if you see intermittent slow first-requests
- **Point-in-time restore (PITR)**: knowing your plan's retention window and how to actually perform a restore before you ever need it in an emergency

## Redis Skills (used alongside Postgres, not instead of it)
- Understanding **what belongs in Redis vs Postgres**: session/refresh tokens, rate-limit counters, cache-aside for hot reads (player list, standings), pub/sub for live score fan-out — none of this belongs in Postgres
- **Cache invalidation strategy**: TTL-based expiry vs explicit invalidation on write (e.g. invalidate cached standings when a `Transfer` is processed)

## Migrations & Operational Discipline (Phase 10)
- **Never editing an applied migration** — always creating a new one, even to fix a mistake
- Writing **backward-compatible migrations** when deploying with zero downtime (e.g. adding a nullable column first, backfilling, then making it required in a later migration, rather than one breaking change)
- **Secrets hygiene**: recognizing that a `.env` file pasted into chat, committed to git, or logged anywhere is compromised and must be rotated — not a theoretical risk, a routine one
- Basic **backup/restore drill**: actually testing a restore at least once before relying on it in production

## Recommended learning order
1. Prisma + Postgres basics → get comfortable with schema.prisma and migrations
2. Relational modeling judgment → design the core schema (Phases 0–3) correctly the first time
3. Derived/cached data patterns → scoring tables, before the scoring engine gets built
4. Indexing fundamentals → apply as each phase's tables go live, don't wait until performance problems appear
5. Neon-specific operational knowledge → pooling/branching, ideally understood before you're debugging a production connection issue
6. Redis cache-aside patterns → as live scoring and standings features come online
7. Migration/secrets discipline → ongoing throughout, but tighten it hard before Phase 10 deployment

## Cache Sync Layer: Redis + React Query Working Together

This is the connective tissue between your database roadmap's Phase 4 (derived/cached data) and Phase 11 (cache sync) — worth calling out as its own skill area since it's where a lot of subtle bugs live in real-time apps like this one.

- **Understanding the two caches are not the same thing and don't sync automatically**: Redis caches shared server-side data; React Query caches per-browser client-side data. Writing to Postgres does not touch either cache — both must be explicitly invalidated, in the right order (Redis first, since it's the shared source other users' React Query caches will eventually read from).
- **Cache-aside vs write-through thinking**: this project uses cache-aside (check cache, miss → read DB → populate cache) rather than write-through (write to cache and DB simultaneously) — know why: cache-aside is simpler to reason about and tolerates cache failures gracefully (Redis down just means slower reads, not broken writes).
- **Invalidate, don't mutate, cached entries**: deleting a Redis key and letting the next read repopulate it is far less error-prone than trying to patch a cached JSON blob in place after a partial update — a skill in restraint as much as implementation.
- **Query key design in React Query**: structuring keys (`['leagueStandings', leagueId]`, `['team', teamId, 'gameweek', gameweekId]`) so that `invalidateQueries` can target precisely what changed without over-invalidating (which causes unnecessary refetch storms) or under-invalidating (which leaves stale data on screen).
- **Distinguishing user-triggered vs server-triggered invalidation**: knowing when a mutation hook's own `onSuccess` is enough (the user just did the thing) versus when you need a WebSocket event (someone/something else changed data the user is currently looking at — live scoring, another league member's transfer, an admin correction).
- **Optimistic update discipline**: React Query's `onMutate`/`onError` rollback pattern is powerful but easy to misuse — reserve it for actions where instant feedback clearly matters (transfers, captain picks), and always test the rollback path, not just the happy path.
- **Debugging cache staleness**: when a user reports "I don't see my update," the debugging skill is knowing which of the three layers (Postgres, Redis, React Query) is actually stale — check them in that order, don't guess.
- **Room/namespace design for Socket.IO**: scoping events to `league:{id}` or `gameweek:{id}:live` rooms rather than broadcasting globally — both a performance skill (don't wake up every connected client for one league's transfer) and a correctness skill (avoid leaking one user's data into another's event stream).

### Recommended addition to the learning order (insert after item 6, Redis cache-aside patterns)
6a. Wire React Query invalidation to match every Redis-invalidating mutation — do this incrementally, one feature at a time, rather than retrofitting it across the whole app later. It's much easier to keep the "one invalidation path" discipline (see database-roadmap.md §11.4) if it's built in from each feature's first mutation hook.
