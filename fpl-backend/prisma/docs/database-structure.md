# Database Structure — FPL Clone

This isn't a "folder structure" in the same sense as frontend/backend (there's no separate app) — it's the **Prisma project layout plus the schema's table/relationship map**, since that's what actually needs organizing on the database side.

---

## 1. File Layout (inside existing `fpl-backend/`)

```
fpl-backend/
├── prisma/
│   ├── schema.prisma              # single source of truth for all models (19 models, 7 enums)
│   ├── migrations/
│   │   ├── 20260701142400_init/
│   │   ├── 20260701150000_phase2_fixture_fpl_fields/
│   │   └── ...                     # one folder per migration, auto-named by Prisma
│   ├── seed.ts                     # seeds RealTeam/Player/Fixture/Gameweek for local dev
│   └── docs/
│       ├── erd.md                  # entity-relationship diagram (from live schema.prisma)
│       ├── decisions.md            # PK, delete, cascade, and Neon URL conventions
│       ├── database-roadmap.md
│       ├── database-structure.md   # this file
│       ├── database-skill.md
│       ├── ops-backup-restore.md   # PITR checklist, db:backup/restore
│       ├── ops-environments.md     # Neon staging branch workflow
│       └── ops-secrets.md          # secrets rotation checklist
│   └── scripts/
│       └── explain-hot-paths.sql   # EXPLAIN ANALYZE baseline (npm run db:explain)
│
├── scripts/
│   ├── db-backup.sh                # pg_dump via DIRECT_URL → backups/
│   ├── db-restore.sh               # restore from SQL dump (staging/dev only)
│   └── seedLoadTest.ts
│
├── backups/                        # gitignored SQL dumps from db:backup
│
├── .env.example                    # local dev template
└── .env.staging.example            # Neon staging branch template
```

**Prisma schema datasource block** (two URLs — pooled for app, direct for migrations):
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")     // pooled Neon connection, used by the running app
  directUrl = env("DIRECT_URL")       // unpooled Neon connection, used only by `prisma migrate`
}
```

---

## 2. Table / Relationship Map

**Authoritative diagram:** [`erd.md`](erd.md) — generated from live `schema.prisma`.

Concise summary (19 models):

```
User
 ├── 1:N → Team (one per season: unique userId + season)
 ├── 1:N → LeagueMembership
 ├── 1:N → AuditLog (as adminId)
 └── 1:N → RecalculationLog (as triggeredBy)
     Auth fields: displayName, role, passwordReset*, totpSecret/twoFactorEnabled — see decisions.md § Auth tables

Team
 ├── N:1 → User
 ├── 1:N → Squad, Transfer, ChipUsage, SquadGameweekSnapshot, TeamGameweekScore
 └── 1:N → LeagueMembership (team entry)
     @@unique(userId, season) — one team per user per season
     freeTransfers counter; Transfer rows → TeamGameweekScore.transferHit — see decisions.md § Transfer tables

Squad (join: Team ↔ Player)     [unique: teamId + playerId; isStarter + benchOrder + captain flags]

Player
 ├── N:1 → RealTeam
 ├── 1:N → Squad, PlayerGameweekStats, SquadGameweekSnapshot, PlayerPriceHistory
 └── 1:N → Transfer (playerIn / playerOut)
     PlayerPriceHistory = Phase 2 extension (append-only price tracking)

RealTeam → Player, Fixture (home/away)     [ingested from FPL API — see decisions.md § Reference data tables]

Gameweek → Fixture, PlayerGameweekStats, Transfer, SquadGameweekSnapshot, TeamGameweekScore, RecalculationLog

Fixture → Gameweek, RealTeam (home/away)   [FDR via homeDifficulty/awayDifficulty]

League → LeagueMembership       [adminUserId = creator, no Prisma FK — see decisions.md § League tables]

LeagueMembership (join: League ↔ User ↔ Team)
 [unique: leagueId + userId, leagueId + teamId]

ChipUsage → Team only           [gameweekNumber + season; wildcardNumber; squadBackup for FREE_HIT — see decisions.md § Chip tables]

TeamGameweekScore, SquadGameweekSnapshot   [cached/derived scoring — Phase 4]
     Flow: PlayerGameweekStats + snapshot → scoring.engine → TeamGameweekScore → Team.totalPoints

SyncLog, AlertConfig            [standalone — no FK relations]

H2HFixture                      [deferred — HEAD_TO_HEAD enum only; see decisions.md § League tables]
```

PK, delete, and cascade conventions: [`decisions.md`](decisions.md). Reference data: § Reference data tables. Squad/Team: § Squad tables. Scoring: § Scoring tables. Transfers: § Transfer tables. Chips: § Chip tables. Leagues: § League tables.

---

## 3. Index Summary (current schema)

| Table | Index / unique | Reason |
|---|---|---|
| `User` | unique `email` (`User_email_key`) | login lookups — `@unique` provides the index |
| `User` | index `isSuspended` | admin user list filtering |
| `User` | index `createdAt` | admin user list sorting |
| `Team` | unique `(userId, season)` | one team per user per season |
| `Team` | index `userId` | fetch teams by user |
| `Squad` | unique `(teamId, playerId)` | prevent duplicate player in squad |
| `Squad` | index `teamId`, `playerId` | squad fetch, player lookup |
| `Player` | unique `fplId` | ingestion upsert |
| `Player` | index `realTeamId`, `position`, `price`, `(position, price)` | squad-builder filtering + price sort |
| `Player` | GIN trgm on `lower(name)` (`Player_name_trgm_idx`) | ILIKE name search — migration-only, not in Prisma DSL |
| `PlayerPriceHistory` | index `(playerId, changedAt)` | price history queries |
| `RealTeam` | unique `fplId` | ingestion upsert |
| `Gameweek` | unique `number` | FPL gameweek number |
| `Gameweek` | index `isCurrent` | current gameweek lookup |
| `Fixture` | unique `fplId` | ingestion upsert |
| `Fixture` | index `gameweekId`, `homeTeamId`, `awayTeamId` | fixtures by gameweek/team |
| `Fixture` | index `(gameweekId, kickoffTime)` | sorted fixture lists |
| `Fixture` | index `(gameweekId, finished, kickoffTime)` | live/finished fixture queries |
| `PlayerGameweekStats` | unique `(playerId, gameweekId)` | idempotent scoring writes |
| `PlayerGameweekStats` | index `gameweekId` | live scoring per gameweek |
| `TeamGameweekScore` | unique `(teamId, gameweekId)` | idempotent recalculation |
| `TeamGameweekScore` | index `gameweekId` | standings aggregation |
| `SquadGameweekSnapshot` | unique `(teamId, gameweekId, playerId)` | idempotent snapshots |
| `SquadGameweekSnapshot` | index `(teamId, gameweekId)` | squad-at-gameweek fetch |
| `Transfer` | index `teamId`, `gameweekId`, `(teamId, gameweekId)` | history + analytics |
| `League` | unique `inviteCode` | join-by-code |
| `League` | index `season` | season-scoped league lists |
| `LeagueMembership` | unique `(leagueId, userId)`, `(leagueId, teamId)` | prevent duplicate join |
| `LeagueMembership` | index `leagueId`, `userId` | standings + user leagues |
| `ChipUsage` | unique `(teamId, chipType, season, wildcardNumber)` | one use per chip per season |
| `ChipUsage` | index `teamId` | chip state per team |
| `RecalculationLog` | index `gameweekId`, `createdAt`, `triggeredBy` | admin recalc history |
| `AuditLog` | index `(adminId, createdAt)`, `(targetType, targetId)`, `createdAt` | entity + admin audit views |
| `SyncLog` | index `startedAt`, `syncType`, `success` | ingestion monitoring |
| `AlertConfig` | unique `alertType` | one config per alert type |

---

## 4. Environment Separation

| Environment | Database | Notes |
|---|---|---|
| Local dev | Docker Compose Postgres OR Neon dev branch | [`.env.example`](../../.env.example) — `DATABASE_URL` may equal `DIRECT_URL` for Docker |
| Test (CI) | Ephemeral embedded Postgres | [`tests/globalSetup.js`](../../tests/globalSetup.js) — never use prod data |
| Staging | Neon branch off `main` | See [`ops-environments.md`](ops-environments.md); template [`.env.staging.example`](../../.env.staging.example) |
| Production | Neon `main` branch | Pooled `DATABASE_URL` for app; `DIRECT_URL` for migrations only |

**Secrets:** follow [`ops-secrets.md`](ops-secrets.md) before deploying beyond localhost.

### Production query monitoring (`pg_stat_statements`)

Use this to find slow queries in production rather than guessing from local EXPLAIN runs.

1. **Enable extension** (direct / unpooled connection only):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```
2. **Neon console:** paid tiers expose **Monitoring → Query performance**; otherwise query manually:
   ```sql
   SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   ORDER BY total_exec_time DESC
   LIMIT 20;
   ```
3. **Reset after deploy or migration** (so new query shapes dominate the stats):
   ```sql
   SELECT pg_stat_statements_reset();
   ```
4. **Review cadence:** monthly, or after a performance regression — cross-check with Redis cache hit rates and `npm run db:explain` locally after schema changes.

---

## 5. Cache Key Map — Redis ↔ React Query

This table is the map both sides of the app should refer to — Redis keys on the backend, React Query keys on the frontend — so a developer changing one side always knows the exact counterpart to update on the other. **Code is the source of truth**; keys are built via `CACHE_PREFIX` + `buildCacheKey` in [`src/lib/cache.ts`](../../src/lib/cache.ts).

| Resource | Redis key pattern | TTL (defaults) | React Query key | Invalidated by |
|---|---|---|---|---|
| Player list (filtered) | `players:list:{filterHash}` | 600s (`CACHE_TTL_PLAYERS_SECONDS`) | `['players', filters]` | `syncPlayers`, `syncAll` (after teams + players steps), admin `updatePlayer`, live `gw:stats:updated` / price events |
| Fixtures list (filtered) | `fixtures:list:{filterHash}` | 600s (`CACHE_TTL_FIXTURES_SECONDS`) | `['fixtures', filters]` *(broad invalidation; Fixtures page still placeholder)* | `syncFixtures`, `syncAll` (after gameweeks + fixtures steps), admin `updateFixture`, live `gw:stats:updated` |
| League standings | `standings:{leagueId}:{filterHash}` | 30s live GW / 300s otherwise | `['leagueStandings', leagueId]` via `queryKeys.leagueStandings` | Transfers (`invalidateStandingsForTeam`), league create/join, scoring job, admin recalculation/correction, `standings:updated` socket |
| Team detail | *(uncached)* | — | `['team', teamId]` and `['team', teamId, gameweek]` | Squad save, lineup change, captain change, transfers |
| Team GW score (live) | *(uncached — socket-driven)* | — | `['team', teamId, gameweek]` + `['teamGwBreakdown', teamId, gameweek]` | `team:score:updated` via `useLiveTeamScores` |
| Ingestion last sync | `ingestion:lastSync` (single key) | overwritten each run | `['ingestion', 'status']` (admin only) | `recordIngestionSync` on `syncAll`; admin `useTriggerSync` invalidates RQ |
| Admin dashboard summary | *(uncached — Postgres direct)* | — | `['dashboard', 'summary']` | 30s `staleTime` polling; `useTriggerSync` invalidates on manual sync |

**Not implemented (intentional — do not add without a new feature):**

- Single player detail Redis (`players:detail:{playerId}`) / `['player', playerId]` — no `GET /api/players/:id`; list cache suffices today.
- Team gameweek score Redis (`team:score:{teamId}:{gameweekId}`) / `['teamScore', …]` — live path uses sockets + direct DB reads instead.
- Admin dashboard Redis (`admin:dashboard:summary`) / `['adminDashboardSummary']` — dashboard hits Postgres directly.

**Reading this table:** when you build a mutation that changes cached data, invalidate the matching Redis prefix first (`invalidateByPrefix`), then ensure the frontend mutation hook or socket listener calls `queryClient.invalidateQueries` for the matching React Query key. `syncAll` flushes `players:list:*` after teams and players sync steps, and `fixtures:list:*` after gameweeks and fixtures steps. Admin `updatePlayer` / `updateFixture` flush the respective list prefixes after the Postgres transaction.

Full sync pattern: [`cache-sync.md`](cache-sync.md).

## 6. Live Event → Socket Room Map (for Phase 11.4 server-driven invalidation)

| Event | Socket room | Payload | Frontend action |
|---|---|---|---|
| Gameweek stats updated | `gw:{gameweekNumber}` | `{ gameweekNumber, updatedPlayerIds[] }` | Invalidate open player/team queries via `useLiveGameweek` |
| Team score updated | `team:{teamId}` | `{ teamId, gameweekNumber, totalPoints, pointsStatus }` | Invalidate `['team', teamId, gameweekNumber]` via `useLiveTeamScores` |
| Gameweek finalized | `gw:{gameweekNumber}` | `{ gameweekNumber }` | Invalidate league standings + team scores via `useLiveNotifications` |
| League standings changed | `league:{leagueId}` | `{ leagueId }` | Invalidate `['leagueStandings', leagueId]` via `useLiveLeagueStandings` |
| Admin points correction | *(Redis flush + per-league emit)* | `{ leagueId }` on each league room | Consumer: same as standings changed via `useLiveLeagueStandings`. Admin app: no socket listeners — manual refresh acceptable for internal tool. |

Rooms are joined client-side based on what the user is currently viewing (e.g. join `league:{leagueId}` only while the standings page for that league is mounted, leave on unmount) — don't join every room globally on connect, that defeats the purpose of scoping.
