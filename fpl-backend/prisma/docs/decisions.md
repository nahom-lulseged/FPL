# Schema Decisions — FPL Clone

This document records **decisions already implemented** in [`schema.prisma`](../schema.prisma). It describes what IS — not proposed changes.

Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, and Phase 7 were closed retroactively: the schema and migrations pre-existed; this file formalizes the conventions encoded in that code.

---

## Primary keys

### Internal IDs: `cuid()` on every model

All 19 models use:

```prisma
id String @id @default(cuid())
```

**Rationale:** CUIDs are opaque, URL-safe, and collision-resistant. They work well for entities exposed in API paths (`User`, `Team`, `League`) without leaking sequential ordering.

### External FPL API IDs: separate `fplId` columns

| Model | External ID field | Notes |
|---|---|---|
| `Player` | `fplId Int? @unique` | FPL "element" id from ingestion |
| `RealTeam` | `fplId Int? @unique` | FPL team id |
| `Fixture` | `fplId Int? @unique` | FPL fixture id |
| `Gameweek` | `number Int @unique` | FPL gameweek number (not named `fplId`) |

Internal PKs stay as CUIDs. Ingestion upserts match on `fplId` / `number`, not on the internal `id`.

**Deviation from roadmap illustration:** The planning roadmap suggested integer PKs for reference tables (`Player`, `Fixture`). The implemented schema uses CUID + external id columns instead, decoupling DB primary keys from FPL API id stability.

---

## Soft-delete vs hard-delete

### Convention: hard delete everywhere

**No `deletedAt` columns exist** on any model. Rows are physically deleted.

### Per-entity alternatives

| Concern | Mechanism | Models |
|---|---|---|
| Account lock (not deletion) | `isSuspended`, `suspendedAt`, `suspendedReason` | `User` |
| Admin edit protection | `isManualOverride` flag | `Player`, `RealTeam`, `Fixture`, `Gameweek` |
| Immutable audit trail | Append-only `AuditLog` with `beforeJson` / `afterJson` | Admin mutations |
| Scoring history | `SquadGameweekSnapshot`, `TeamGameweekScore` | Point-in-time squad/score records |
| Price history | `PlayerPriceHistory` append-only rows | Player price changes |

### When hard delete is acceptable

- **User-owned trees** (`Team` → `Squad`, `Transfer`, `ChipUsage`, etc.): cascade delete is intentional — deleting a user removes their fantasy data.
- **Reference data** (`Player`, `RealTeam`): cascade to dependent rows where FKs are defined; ingestion re-creates from FPL API on next sync.
- **Audit logs**: cascade when the admin `User` is deleted (`onDelete: Cascade` on `AuditLog.adminId`). In practice admins should rarely be deleted; logs are the accountability record.

---

## Foreign key cascade rules

All explicit `onDelete` behaviors from `schema.prisma`:

| Parent deleted | Child | `onDelete` |
|---|---|---|
| `User` | `Team`, `LeagueMembership`, `AuditLog`, `RecalculationLog` | `Cascade` |
| `Team` | `Squad`, `Transfer`, `ChipUsage`, `LeagueMembership`, `SquadGameweekSnapshot`, `TeamGameweekScore` | `Cascade` |
| `Player` | `Squad`, `PlayerGameweekStats`, `SquadGameweekSnapshot`, `Transfer`, `PlayerPriceHistory` | `Cascade` |
| `RealTeam` | `Player`, `Fixture` (home/away) | `Cascade` |
| `Gameweek` | `Fixture`, `PlayerGameweekStats`, `Transfer`, `SquadGameweekSnapshot`, `TeamGameweekScore`, `RecalculationLog` | `Cascade` |
| `League` | `LeagueMembership` | `Cascade` |

Models with **no FK relations**: `SyncLog`, `AlertConfig`.

`League.adminUserId` is a plain string (creator id) — no FK relation or cascade defined.

---

## Application-layer vs database-layer rules

FPL game rules (budget ≤ £100m, max 3 players per club, position quotas, formation validation) are **not** enforced via CHECK constraints or triggers. They live in application code (`squadValidator.ts` and related services).

The database enforces:
- Referential integrity (FKs)
- Uniqueness (composite unique indexes)
- Basic type constraints (enums, NOT NULL)

---

## Notable structural choices

### One team per user per season

```prisma
@@unique([userId, season])
```

A user may have multiple `Team` rows across seasons, but only one per season.

### Chip usage: season-scoped, no gameweek FK

`ChipUsage` stores `gameweekNumber Int` + `season String` rather than `gameweekId`. Wildcard allows two uses per season via `wildcardNumber` (nullable for non-wildcard chips). Unique constraint: `(teamId, chipType, season, wildcardNumber)`.

### League membership includes team

`LeagueMembership` FKs `userId`, `leagueId`, and `teamId`. A user joins a league with a specific fantasy team for that season.

### League creator

`League.adminUserId` identifies the league creator. There is no Prisma `@relation` to `User` — lookups are by id in application code.

### Derived / cached scoring data

- `SquadGameweekSnapshot` — frozen squad state per team per gameweek (for autosubs, chip effects, historical views).
- `TeamGameweekScore` — cached aggregate points per team per gameweek; upserted by the scoring engine.
- `RecalculationLog` — admin-triggered recalculation audit trail.

---

## Auth tables (Phase 1)

Phase 1 was closed retroactively: the `User` model and auth-related migrations pre-existed. This section documents the live auth schema and token storage decisions.

### Roadmap vs schema naming

| Roadmap says | Schema has | Notes |
|---|---|---|
| `name` | `displayName` | User-facing display name |
| `isAdmin` | `role Role` enum (`USER` / `ADMIN`) | Extensible beyond a boolean |

### User model field map

| Field | Type | Purpose | Migration |
|---|---|---|---|
| `id` | `String` (cuid) | Primary key | `20260701142400_init` |
| `email` | `String @unique` | Login identifier | init |
| `passwordHash` | `String` | bcrypt hash (cost 12) | init |
| `displayName` | `String` | Display name | init |
| `role` | `Role` | `USER` or `ADMIN` | init |
| `createdAt` | `DateTime` | Row creation | init |
| `updatedAt` | `DateTime` | Last update | init |
| `isSuspended` | `Boolean` | Account lock flag | `20260702172043_add_user_suspend_and_audit_log` |
| `suspendedAt` | `DateTime?` | When suspension took effect | suspend migration |
| `suspendedReason` | `String?` | Admin-provided reason | suspend migration |
| `passwordResetTokenHash` | `String?` | Hashed one-time reset token | suspend migration |
| `passwordResetExpiresAt` | `DateTime?` | Reset token expiry | suspend migration |
| `totpSecret` | `String?` | TOTP secret for 2FA | `20260704123658_add_admin_2fa` |
| `twoFactorEnabled` | `Boolean` | Whether 2FA is active | 2FA migration |

Additional indexes on `User`: `@@index([isSuspended])`, `@@index([createdAt])` — admin user list queries.

### Email uniqueness

`email` uses `@unique`, which creates Postgres index `User_email_key`. This satisfies both unique constraint and login lookup index requirements. A separate `@@index([email])` would be redundant.

### Refresh tokens: Redis only

**No `RefreshToken` Prisma model exists** and none is planned. Refresh tokens are JWTs validated against a Redis session store.

| Aspect | Value |
|---|---|
| Redis key | `refresh:{userId}` |
| TTL | 7 days (`REFRESH_TTL_SECONDS`) |
| Access token expiry | 15 minutes |
| JWT secrets | `JWT_SECRET` (access), `JWT_REFRESH_SECRET` (refresh) — from `.env` |
| Implementation | [`src/modules/auth/auth.service.ts`](../../src/modules/auth/auth.service.ts) (user app), [`src/modules/admin/auth/adminAuth.service.ts`](../../src/modules/admin/auth/adminAuth.service.ts) (admin app) |

**Login/register flow:** verify `User` in Postgres → sign access + refresh JWTs → `SET refresh:{userId}` in Redis with TTL.

**Refresh flow:** verify JWT signature → `GET refresh:{userId}` from Redis → compare stored token → issue new access token.

**Revocation:** `DEL refresh:{userId}` on user suspend or password reset ([`adminUsers.service.ts`](../../src/modules/admin/users/adminUsers.service.ts)).

### Password reset tokens

Distinct from refresh tokens. Stored **on the `User` row** as `passwordResetTokenHash` + `passwordResetExpiresAt` (hashed, not plaintext). Cleared after successful reset. Not stored in Redis.

### Two-factor authentication (admin)

`totpSecret` is nullable — populated only when an admin enables 2FA (`twoFactorEnabled = true`). Used by the admin auth path with `otplib`; user-facing registration/login does not require 2FA unless extended later.

---

## Reference data tables (Phase 2)

Phase 2 was closed retroactively: reference models, ingestion, and `SyncLog` pre-existed. Data is sourced from the FPL public API (`fantasy.premierleague.com/api/`) and upserted via [`src/modules/ingestion/`](../../src/modules/ingestion/).

### Ingestion flow

1. FPL API responses mapped in [`mappers.ts`](../../src/modules/ingestion/mappers.ts)
2. Upserts in [`ingestion.service.ts`](../../src/modules/ingestion/ingestion.service.ts) — match on `fplId` (teams/players/fixtures) or `Gameweek.number`
3. Each sync wrapped in `withSyncLog()` ([`ingestion.syncLog.ts`](../../src/modules/ingestion/ingestion.syncLog.ts)) — writes a `SyncLog` row

### Roadmap vs schema deviations

| Area | Roadmap says | Schema has | Rationale |
|---|---|---|---|
| RealTeam PK | `id` = FPL team id | `id` cuid + `fplId Int? @unique` | Phase 0 PK pattern |
| RealTeam strength | strength ratings columns | **Not stored** | FDR per fixture: `homeDifficulty` / `awayDifficulty` on `Fixture` |
| Player status | `status` string | `isAvailable Boolean` + `injuryNote String?` | FPL codes `a`/`d` → boolean in mapper |
| Player stats | `form`, `totalPoints`, `selectedByPercent` | **Not on `Player` row** | Season totals derivable from `PlayerGameweekStats`; list API omits them |
| Gameweek name | `name` | `number Int @unique` | FPL gameweek number is the identifier |
| Gameweek flags | `isNext`, `finished` boolean | `status GameweekStatus` enum | `UPCOMING` / `LIVE` / `FINISHED`; `isNext` derivable from ordering |
| Gameweek deadline | `deadlineTime` | `deadline DateTime` | Same purpose, different name |
| PlayerGameweekStats | `cleanSheets`, `cards` | `cleanSheet Boolean`, `yellowCards`, `redCards` | Granular fields for scoring engine |

### RealTeam field map

| Field | Type | Purpose | Migration |
|---|---|---|---|
| `id` | `String` (cuid) | Internal PK | `20260701142400_init` |
| `fplId` | `Int? @unique` | FPL team id for upsert | init |
| `name` | `String` | Full club name | init |
| `shortName` | `String` | Short code (e.g. ARS) | init |
| `crestUrl` | `String?` | Club crest image URL | `20260702173525_add_content_admin_override_fields` |
| `isManualOverride` | `Boolean` | Skip ingestion overwrite | override migration |
| `createdAt`, `updatedAt` | `DateTime` | Timestamps | init |

### Player field map

| Field | Type | Purpose | Migration |
|---|---|---|---|
| `id` | `String` (cuid) | Internal PK | init |
| `fplId` | `Int? @unique` | FPL element id | init |
| `name` | `String` | Display name | init |
| `position` | `Position` | GK / DEF / MID / FWD | init |
| `price` | `Int` | Price in tenths of £m (FPL `now_cost`) | init |
| `realTeamId` | `String` FK | Club | init |
| `isAvailable` | `Boolean` | Selectable in squad/transfers | init |
| `injuryNote` | `String?` | Availability note | init |
| `isManualOverride` | `Boolean` | Skip ingestion overwrite | `20260702165615_add_sync_log_and_player_override` |
| `createdAt`, `updatedAt` | `DateTime` | Timestamps | init |

**Public list API** ([`players.repository.ts`](../../src/modules/players/players.repository.ts)) returns: `id`, `name`, `position`, `price`, `isAvailable`, nested `realTeam`.

### Gameweek field map

| Field | Type | Purpose | Migration |
|---|---|---|---|
| `id` | `String` (cuid) | Internal PK | init |
| `number` | `Int @unique` | FPL gameweek number | init |
| `deadline` | `DateTime` | Transfer/lineup lock time | init |
| `status` | `GameweekStatus` | UPCOMING / LIVE / FINISHED | init |
| `isCurrent` | `Boolean` | Active gameweek flag | init |
| `isManualOverride` | `Boolean` | Skip ingestion overwrite | override migration |
| `createdAt`, `updatedAt` | `DateTime` | Timestamps | init |

Index: `@@index([isCurrent])`.

### Fixture field map

| Field | Type | Purpose | Migration |
|---|---|---|---|
| `id` | `String` (cuid) | Internal PK | init |
| `fplId` | `Int? @unique` | FPL fixture id | `20260701150000_phase2_fixture_fpl_fields` |
| `gameweekId` | `String` FK | Gameweek | init |
| `homeTeamId`, `awayTeamId` | `String` FK | Clubs | init |
| `kickoffTime` | `DateTime` | Scheduled start | init |
| `homeDifficulty`, `awayDifficulty` | `Int?` | FDR ratings (1–5) | init |
| `homeScore`, `awayScore` | `Int?` | Match result | init |
| `finished` | `Boolean` | Match complete | init |
| `isPostponed` | `Boolean` | Postponement flag | init |
| `isManualOverride` | `Boolean` | Skip ingestion overwrite | override migration |
| `createdAt`, `updatedAt` | `DateTime` | Timestamps | init |

### PlayerGameweekStats field map

| Field | Type | Notes |
|---|---|---|
| `playerId`, `gameweekId` | FKs | Composite unique `(playerId, gameweekId)` |
| `minutes`, `goals`, `assists` | `Int` | Core stats |
| `cleanSheet` | `Boolean` | Not a count column |
| `goalsConceded`, `saves` | `Int` | GK/DEF scoring inputs |
| `yellowCards`, `redCards` | `Int` | Card discipline |
| `ownGoals`, `penaltiesMissed`, `penaltiesSaved` | `Int` | Rare events |
| `bonus`, `bps` | `Int` | Bonus points system |
| `points` | `Int` | FPL points for gameweek |
| `provisionalBonus` | `Int?` | Live-match provisional bonus | `20260702180000_phase8_live_jobs` |

Index: `@@index([gameweekId])` — live scoring queries per gameweek.

### PlayerPriceHistory (Phase 2 extension)

Append-only price change log per player. Not in the original Phase 2 checklist but supports tracking price movements over time.

| Field | Purpose |
|---|---|
| `playerId` FK | Player |
| `price` | Price at change |
| `changedAt` | When recorded |

Index: `@@index([playerId, changedAt])`.

### SyncLog

Standalone ingestion audit table — no FK relations.

| Field | Type | Purpose |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `syncType` | `SyncType` | `ALL`, `TEAMS`, `PLAYERS`, `FIXTURES`, `GAMEWEEKS` |
| `startedAt` | `DateTime` | Job start |
| `finishedAt` | `DateTime?` | Job end |
| `success` | `Boolean` | Outcome |
| `rowsChanged` | `Int` | Upsert count |
| `errorMessage` | `String?` | Failure detail |

Migration: `20260702165615_add_sync_log_and_player_override`. Indexes on `startedAt`, `syncType`, `success`.

### `isManualOverride` ingestion behavior

When `isManualOverride` is `true` on `Player`, `RealTeam`, `Gameweek`, or `Fixture`, ingestion **skips updating** that row's synced fields (admin edits are preserved). Implemented in [`ingestion.service.ts`](../../src/modules/ingestion/ingestion.service.ts) per-entity upsert `update` branches.

### Index coverage (Phase 2 checklist)

| Roadmap index | Present | Notes |
|---|---|---|
| `Player.realTeamId` | Yes | `@@index([realTeamId])` |
| `Player.position` | Yes | `@@index([position])` |
| `Fixture.gameweekId` | Yes | Plus `homeTeamId`, `awayTeamId`, composites |
| `PlayerGameweekStats.gameweekId` | Yes | Plus unique `(playerId, gameweekId)` |
| `Player.price` | Yes | Plus composite `(position, price)` in `20260705101027` |

### Intentional omissions (not planned as columns)

- **Team strength ratings** on `RealTeam` — use per-fixture FDR on `Fixture` instead
- **`form`, `totalPoints`, `selectedByPercent`** on `Player` — avoid denormalization drift; aggregate from `PlayerGameweekStats` or compute at API layer if needed later
- **`Gameweek.isNext`** — derive from `number` ordering relative to `isCurrent` gameweek

---

## Squad tables (Phase 3)

Phase 3 was closed retroactively: `Team` and `Squad` models and `squadValidator.ts` pre-existed in the init migration. Fantasy squad state lives in Postgres; FPL game rules are enforced in application code, not DB constraints.

### Roadmap vs schema deviations

| Roadmap says | Schema has | Notes |
|---|---|---|
| `userId` unique (one team per user) | `@@unique([userId, season])` | One fantasy team per user **per season** |
| `isStarting` | `isStarter Boolean` | Starting XI flag |
| `benchPosition` | `benchOrder Int?` | 1–4 for bench; `null` for starters |
| Team fields minimal | Also `name`, `season`, `squadValue`, `totalPoints`, `freeTransfers` | UI, scoring, transfers (Phase 5) |

### Team field map

| Field | Type | Purpose | Migration |
|---|---|---|---|
| `id` | `String` (cuid) | Primary key | `20260701142400_init` |
| `userId` | `String` FK | Owner | init |
| `name` | `String` | Fantasy team name | init |
| `season` | `String` | Season identifier (e.g. `2024/25`) | init |
| `bankBalance` | `Int` | Remaining budget in tenths of £m; default 1000 | init |
| `squadValue` | `Int` | Total squad price in tenths | init |
| `totalPoints` | `Int` | Cumulative season points | init |
| `freeTransfers` | `Int` | Available free transfers; default 1 | init |
| `createdAt`, `updatedAt` | `DateTime` | Timestamps | init |

**Uniqueness:** `@@unique([userId, season])` — not a global one-team-per-user constraint.

**Indexes:** `@@index([userId])`.

### Squad field map

| Field | Type | Purpose | Migration |
|---|---|---|---|
| `id` | `String` (cuid) | Primary key | init |
| `teamId` | `String` FK | Fantasy team | init |
| `playerId` | `String` FK | Player in squad | init |
| `position` | `Position` | Denormalized from `Player` for lineup queries | init |
| `isStarter` | `Boolean` | In starting XI vs bench | init |
| `benchOrder` | `Int?` | Bench priority 1–4; null when starter | init |
| `isCaptain` | `Boolean` | Captain flag | init |
| `isViceCaptain` | `Boolean` | Vice-captain flag | init |
| `acquiredAt` | `DateTime` | When player joined squad | init |

**Uniqueness:** `@@unique([teamId, playerId])` — no duplicate player in same squad.

**Indexes:** `@@index([teamId])`, `@@index([playerId])`.

### Validation architecture (application layer)

FPL squad rules are **not** enforced via Postgres CHECK constraints or triggers. They run in [`squadValidator.ts`](../../src/modules/teams/squadValidator.ts) before writes in [`teams.service.ts`](../../src/modules/teams/teams.service.ts).

| Rule | Constant | Validator function |
|---|---|---|
| Exactly 15 players | `SQUAD_SIZE = 15` | `validateSquadComposition` |
| No duplicate players | — | `validateSquadComposition` |
| Position quotas (2 GK, 5 DEF, 5 MID, 3 FWD) | `POSITION_LIMITS` | `validateSquadComposition` |
| Players must be available | — | `validateSquadComposition` |
| Max 3 per real club | `MAX_PLAYERS_PER_CLUB = 3` | `validateMaxPerClub` |
| Budget ≤ £100m | `BUDGET_TENTHS = 1000` | `validateBudget` |
| Starting XI (11) + bench (4) | `STARTING_XI_SIZE`, `BENCH_SIZE` | `validateLineupStructure` |
| Valid formation (e.g. 3-4-3) | `VALID_FORMATIONS` | `validateFormation` |
| One captain, one vice (both starters) | — | `validateCaptaincy` |
| Full squad create/update | — | `validateFullSquad` |

Constants defined in [`src/lib/constants.ts`](../../src/lib/constants.ts). Default lineup assignment: `assignDefaultLineup`.

The database only prevents duplicate `(teamId, playerId)` pairs — it cannot express cross-row budget or club limits.

### Cascade behavior

| Parent deleted | Child | `onDelete` |
|---|---|---|
| `Team` | `Squad` | `Cascade` |
| `Player` | `Squad` | `Cascade` |

Deleting a `Team` removes all its `Squad` rows (roadmap requirement). Deleting a `Player` also cascades to `Squad` — rare in practice since reference players are shared across many squads; ingestion does not delete players casually.

See also § Foreign key cascade rules for the full cascade matrix.

### Related services

- [`teams.service.ts`](../../src/modules/teams/teams.service.ts) — create team, set lineup, set captain
- [`teams.repository.ts`](../../src/modules/teams/teams.repository.ts) — Prisma reads/writes for team + squad

---

## Scoring tables (Phase 4)

Phase 4 was closed retroactively: cached scoring tables and the scoring engine pre-existed. Team gameweek points are **stored** in `TeamGameweekScore` and upserted by jobs — not recalculated on every page load.

### Design decision: cached vs live scoring

| Approach | Implementation |
|---|---|
| Live recalculation on read | **Not used** for team gameweek totals |
| Cached derived rows | `TeamGameweekScore` upserted by [`scoring.job.ts`](../../src/modules/scoring/scoring.job.ts) |
| Season aggregate | `Team.totalPoints` recomputed from sum of `TeamGameweekScore.totalPoints` via `recomputeTeamTotalPoints` |
| Read paths | [`scoring.service.ts`](../../src/modules/scoring/scoring.service.ts), [`leagues.repository.ts`](../../src/modules/leagues/leagues.repository.ts) |

**Roadmap deviation:** No `computedAt` column. Freshness is implied by upsert; per-player detail lives in `breakdown Json?`.

### SquadGameweekSnapshot field map

Frozen squad state per team per gameweek — required for autosubs, captaincy, and chip-aware scoring. Migration: `20260701160802_phase4_scoring`.

| Field | Type | Purpose |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `teamId`, `gameweekId`, `playerId` | FKs | Snapshot identity |
| `position` | `Position` | Position at gameweek lock |
| `isStarter`, `benchOrder` | Boolean / `Int?` | Lineup state |
| `isCaptain`, `isViceCaptain` | Boolean | Captaincy at lock |

**Uniqueness:** `@@unique([teamId, gameweekId, playerId])`. **Index:** `@@index([teamId, gameweekId])`.

**Write pattern:** delete-all-then-createMany per `(teamId, gameweekId)` in [`upsertSquadSnapshot`](../../src/modules/scoring/scoring.repository.ts).

### TeamGameweekScore field map

| Field | Type | Purpose |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `teamId`, `gameweekId` | FKs | Score identity |
| `startersPoints` | `Int` | Starting XI base points |
| `captainBonus` | `Int` | Captain multiplier bonus |
| `benchPoints` | `Int` | Bench boost / bench contribution |
| `transferHit` | `Int` | Points deducted for extra transfers |
| `totalPoints` | `Int` | Net gameweek total |
| `breakdown` | `Json?` | Per-player scoring detail |

**Uniqueness:** `@@unique([teamId, gameweekId])` — idempotent upsert key. **Index:** `@@index([gameweekId])` for standings aggregation.

**Write pattern:** `upsert` on `teamId_gameweekId` in [`upsertTeamGameweekScore`](../../src/modules/scoring/scoring.repository.ts).

### Scoring pipeline

```
PlayerGameweekStats + SquadGameweekSnapshot
  → scoring.engine.ts (autosubs, captain, chips)
  → scoring.job.ts (cron / admin trigger)
  → upsertTeamGameweekScore
  → recomputeTeamTotalPoints (Team.totalPoints)
```

Key modules:
- [`scoring.engine.ts`](../../src/modules/scoring/scoring.engine.ts) — `scoreTeamGameweek`
- [`autoSubstitution.ts`](../../src/modules/scoring/autoSubstitution.ts) — bench autosubs
- [`playerPoints.calculator.ts`](../../src/modules/scoring/playerPoints.calculator.ts) — stat → points
- [`bonus.service.ts`](../../src/modules/scoring/bonus.service.ts) — provisional bonus during live GWs

### RecalculationLog field map

Admin-triggered scoring reruns. Migration: `20260703153000_add_recalculation_log`.

| Field | Type | Purpose |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `gameweekId` | `String` FK | Gameweek recalculated |
| `triggeredBy` | `String` FK | Admin `User.id` |
| `type` | `String` | `FULL_RECALC` or `CORRECTION` |
| `teamsAffected` | `Int` | Teams rescored |
| `deltasJson` | `Json` | Point deltas per team |
| `reason` | `String?` | Admin-provided reason |
| `createdAt` | `DateTime` | When committed |

**Indexes:** `gameweekId`, `createdAt`, `triggeredBy`.

Written by [`admin/scoring/scoring.service.ts`](../../src/modules/admin/scoring/scoring.service.ts) on `commitRecalculate` and `commitCorrection`.

### AuditLog usage for scoring

`AuditLog` table schema is defined in Phase 8 (suspend migration). Scoring commits use [`logAdminAction`](../../src/modules/admin/audit/auditLog.service.ts):

| Action | When | `targetType` | JSON payload |
|---|---|---|---|
| `RECALCULATE_COMMIT` | Full gameweek recalc | `Scoring` | `before`: diffs; `after`: reason, teamsScored |
| `CORRECTION_COMMIT` | Single stat correction | `Scoring` | `before`/`after`: correction detail, diffs |

Loose coupling: `targetId` is `gameweekId`; entity history queryable via `(targetType, targetId)` index.

### Related services

- [`scoring/`](../../src/modules/scoring/) — engine, job, repository, public API
- [`admin/scoring/`](../../src/modules/admin/scoring/) — preview/commit recalc and corrections

---

## Transfer tables (Phase 5)

Phase 5 was closed retroactively: the `Transfer` model, indexes, and `Team.freeTransfers` counter pre-existed in the init migration. Transfer history is append-only; points hits are tracked separately from price deltas.

### Roadmap vs schema deviations

| Roadmap says | Schema has | Notes |
|---|---|---|
| `pointsCost` (0 or -4 per transfer) | **Not on `Transfer` row** | FPL points hit accumulated on `TeamGameweekScore.transferHit` per gameweek batch |
| — | `pricePaid Int` on `Transfer` | Budget impact: `playerIn.price − playerOut.price` in tenths of £m |

### Transfer field map

| Field | Type | Purpose | Migration |
|---|---|---|---|
| `id` | `String` (cuid) | Primary key | `20260701142400_init` |
| `teamId` | `String` FK | Fantasy team | init |
| `playerInId` | `String` FK | Player bought in | init (`TransferIn` relation) |
| `playerOutId` | `String` FK | Player sold out | init (`TransferOut` relation) |
| `gameweekId` | `String` FK | Gameweek when transfer made | init |
| `pricePaid` | `Int` | Net price delta (tenths of £m) | init |
| `createdAt` | `DateTime` | When recorded | init |

**Indexes:** `@@index([teamId])`, `@@index([gameweekId])`, `@@index([teamId, gameweekId])` (composite added in `20260702190000_phase9_performance_indexes`).

**Cascade:** deleting `Team`, `Player`, or `Gameweek` cascades to related `Transfer` rows.

### Points hit vs price paid

Two separate concerns:

| Concern | Where stored | How computed |
|---|---|---|
| Budget impact of swap | `Transfer.pricePaid` | `playerIn.price − playerOut.price` per row |
| FPL points deduction | `TeamGameweekScore.transferHit` | `calculateTransferHit(count, freeTransfers)` → multiples of 4 |

On each transfer batch, [`executeTransfers`](../../src/modules/transfers/transfers.repository.ts) atomically:
1. Swaps `Squad` rows
2. Creates `Transfer` rows
3. Updates `Team.bankBalance`, `squadValue`, `freeTransfers`
4. Accumulates `batchHit` onto `TeamGameweekScore.transferHit` for the current gameweek

Scoring engine reads `transferHit` from `TeamGameweekScore` when computing totals ([`scoring.job.ts`](../../src/modules/scoring/scoring.job.ts)).

### Free-transfer lifecycle (`Team.freeTransfers`)

| Stage | Behavior |
|---|---|
| Initial value | `freeTransfers Int @default(1)` on `Team` |
| On transfer | `deductFreeTransfers(current, count)` — reduced by batch size; wildcard skips deduction |
| Gameweek rollover | `rolloverFreeTransfers(current)` → `min(2, current + 1)` via [`transfers.rollover.ts`](../../src/modules/transfers/transfers.rollover.ts) |
| Job triggers | [`gameweekFinalization.job.ts`](../../src/jobs/gameweekFinalization.job.ts), ingestion bootstrap |
| Idempotency | Redis key `transfers:rollover:gw` prevents double-rollover per gameweek |

Constants in [`src/lib/constants.ts`](../../src/lib/constants.ts): `MAX_FREE_TRANSFERS = 2`, `TRANSFER_HIT_POINTS = 4`.

### Transfer rules ([`transfers.rules.ts`](../../src/modules/transfers/transfers.rules.ts))

| Function | Purpose |
|---|---|
| `calculateTransferHit` | Paid transfers × 4 (0 if wildcard active) |
| `deductFreeTransfers` | Subtract transfer count from allowance (wildcard exempt) |
| `rolloverFreeTransfers` | +1 free transfer per gameweek, cap at 2 |

### Write and read paths

**Write:** [`processTransfers`](../../src/modules/transfers/transfers.service.ts) validates squad rules + deadline → `executeTransfers` (single transaction).

**Read:** [`getTransferHistory`](../../src/modules/transfers/transfers.service.ts) — paginated by `teamId`, optional `gameweek` filter; uses `teamId` / `gameweekId` indexes.

### Related modules

- [`transfers/`](../../src/modules/transfers/) — service, repository, rules, rollover, validation
- [`gameweekFinalization.job.ts`](../../src/jobs/gameweekFinalization.job.ts) — free-transfer rollover on GW advance

---

## Chip tables (Phase 6)

Phase 6 was closed retroactively: `ChipUsage` and chip rules pre-existed in the init migration. Chip state is season-scoped; effects are enforced in application code and the scoring engine.

### Roadmap vs schema deviations

| Roadmap says | Schema has | Notes |
|---|---|---|
| `gameweekId` FK | `gameweekNumber Int` + `season String` | Lookup by GW number within season — no `gameweekId` FK |
| `chipInstance` for Wildcard ×2 | `wildcardNumber Int?` | `1` (first half) or `2` (second half); `null` for non-wildcard chips |

### ChipUsage field map

| Field | Type | Purpose | Migration |
|---|---|---|---|
| `id` | `String` (cuid) | Primary key | `20260701142400_init` |
| `teamId` | `String` FK | Fantasy team | init |
| `chipType` | `ChipType` | `WILDCARD`, `FREE_HIT`, `BENCH_BOOST`, `TRIPLE_CAPTAIN` | init |
| `gameweekNumber` | `Int` | GW when chip was played | init |
| `season` | `String` | Season identifier (matches `Team.season`) | init |
| `wildcardNumber` | `Int?` | `1` or `2` for wildcards; null otherwise | init |
| `squadBackup` | `Json?` | Pre-FREE_HIT squad snapshot for revert | `20260702120000_add_chip_squad_backup` |
| `usedAt` | `DateTime` | When chip was played | init |

**Uniqueness:** `@@unique([teamId, chipType, season, wildcardNumber])`.

**Index:** `@@index([teamId])`.

**Cascade:** deleting `Team` cascades to `ChipUsage` rows.

### Unique constraint and app-layer rules

Database uniqueness prevents duplicate rows. Additional rules in [`chips.rules.ts`](../../src/modules/chips/chips.rules.ts) `canPlayChip`:

| Rule | Error code | Notes |
|---|---|---|
| One chip per gameweek per team | `CHIP_THIS_GW` | Checked before insert |
| Non-wildcard: once per season | `ALREADY_USED` | DB unique + rule |
| Wildcard #1: GW &lt; 20 only | `INVALID_WILDCARD_NUMBER` | `WILDCARD_SECOND_HALF_START_GW = 20` |
| Wildcard #2: GW ≥ 20 only | `INVALID_WILDCARD_NUMBER` | Second-half wildcard |
| Wildcard instance not reused | `WILDCARD_NUMBER_USED` | Per `wildcardNumber` |

### Chip effects (runtime, not DB columns)

| Chip | Stored data | Effect |
|---|---|---|
| `WILDCARD` | `ChipUsage` row | Unlimited transfers ([`isUnlimitedTransferChip`](../../src/modules/chips/chips.rules.ts)); `freeTransfers` reset to 1 on rollover |
| `FREE_HIT` | `ChipUsage` + `squadBackup` JSON | Unlimited transfers; squad reverted next GW |
| `BENCH_BOOST` | `ChipUsage` row | Bench points included in [`scoring.engine.ts`](../../src/modules/scoring/scoring.engine.ts) |
| `TRIPLE_CAPTAIN` | `ChipUsage` row | 3× captain multiplier in scoring engine |

Scoring reads active chip via [`toActiveChipContext`](../../src/modules/chips/chips.repository.ts) / `findChipForGameweek`.

### FREE_HIT revert and chip rollover

On gameweek advance, [`processChipRolloverForNewGameweek`](../../src/modules/chips/chips.rollover.ts):

- **FREE_HIT:** restores `squadBackup` to `Squad`, deletes transfers for previous GW, updates snapshot
- **WILDCARD:** sets `Team.freeTransfers` to 1; team excluded from free-transfer rollover that GW

Redis key `chips:rollover:gw` prevents double-processing (same pattern as transfer rollover).

### Integration points

- **Play chip:** [`playChip`](../../src/modules/chips/chips.service.ts) → `createChipUsage` (stores `squadBackup` for FREE_HIT)
- **Transfers:** `hasUnlimitedTransfers` / `isUnlimitedTransferChip` — wildcard and free hit skip hits and FT deduction
- **Scoring:** `findChipsForGameweekForTeams` in scoring job for bench boost / triple captain

### Related modules

- [`chips/`](../../src/modules/chips/) — service, repository, rules, rollover, validation
- [`chips.rollover.ts`](../../src/modules/chips/chips.rollover.ts) — gameweek-end chip cleanup

---

## League tables (Phase 7)

Phase 7 was closed retroactively for **classic leagues**: `League` and `LeagueMembership` pre-existed in the init migration. Head-to-head (`H2HFixture`) is intentionally deferred — see below.

### Closure scope

| Area | Status |
|---|---|
| Classic leagues (create, join, standings) | Implemented |
| `H2HFixture` table and H2H pairing logic | Deferred — `HEAD_TO_HEAD` enum reserved; creation blocked in app layer |

### Roadmap vs schema deviations

| Roadmap says | Schema has | Notes |
|---|---|---|
| `creatorId` FK | `adminUserId String` | No Prisma `@relation` to `User` — lookups in application code |
| `LeagueMembership` — leagueId, userId, joinedAt | Also `teamId` FK | User joins with a specific fantasy team for the league's season |
| — | `season String` on `League` | Season-scoped; join requires matching `Team.season` |
| — | `updatedAt` on `League` | Standard timestamp |

### League field map

| Field | Type | Purpose | Migration |
|---|---|---|---|
| `id` | `String` (cuid) | Primary key | `20260701142400_init` |
| `name` | `String` | League display name | init |
| `type` | `LeagueType` | `CLASSIC` or `HEAD_TO_HEAD` (H2H creation blocked) | init |
| `inviteCode` | `String` | Join-by-code; case-insensitive lookup | init |
| `adminUserId` | `String` | Creator's user id (not a FK) | init |
| `season` | `String` | Season identifier | init |
| `createdAt` | `DateTime` | Creation time | init |
| `updatedAt` | `DateTime` | Last update | init |

**Uniqueness:** `@unique` on `inviteCode`.

**Index:** `@@index([season])`.

### LeagueMembership field map

| Field | Type | Purpose | Migration |
|---|---|---|---|
| `id` | `String` (cuid) | Primary key | init |
| `leagueId` | `String` FK | League | init |
| `userId` | `String` FK | Member | init |
| `teamId` | `String` FK | Fantasy team entered in this league | init |
| `joinedAt` | `DateTime` | When user joined | init |

**Uniqueness:** `@@unique([leagueId, userId])`, `@@unique([leagueId, teamId])`.

**Indexes:** `@@index([leagueId])`, `@@index([userId])` (userId added in `20260702190000_phase9_performance_indexes`).

**Cascade:** deleting `League`, `User`, or `Team` cascades to related `LeagueMembership` rows.

### Classic standings (computed, not stored)

Standings are **not** a database table. [`computeLeagueStandings`](../../src/modules/leagues/leagues.service.ts) aggregates per member:

| Source | Field used |
|---|---|
| `Team` | `totalPoints`, `name` |
| `TeamGameweekScore` | Current GW points (if live GW exists) |
| `ChipUsage` | Chips played this season |
| `User` | `displayName` (manager name) |

Ranked by [`rankClassicStandings`](../../src/modules/leagues/leagues.rules.ts) — total points descending, manager name tiebreak.

**Cache:** Redis key `league:standings:{leagueId}` via [`getOrSet`](../../src/lib/cache.ts); TTL shorter during live gameweeks. Invalidated on create/join and admin moderation — see [`database-structure.md`](database-structure.md) § cache.

### Create and join flow

**Create** ([`createLeague`](../../src/modules/leagues/leagues.service.ts)):

1. `canCreateLeagueType` — CLASSIC only (H2H blocked)
2. User must have a `Team` for the requested season
3. Generate unique `inviteCode` ([`generateInviteCode`](../../src/modules/leagues/leagues.rules.ts))
4. Transaction: create `League` + admin `LeagueMembership`

**Join** ([`joinLeague`](../../src/modules/leagues/leagues.service.ts)):

1. Lookup league by invite code (case-insensitive)
2. User must have `Team` matching `league.season`
3. Reject if `(leagueId, userId)` or `(leagueId, teamId)` already exists

| Error code | Meaning |
|---|---|
| `LEAGUE_NOT_FOUND` | Invalid invite code |
| `NO_TEAM_FOR_SEASON` | No team for league's season |
| `ALREADY_MEMBER` | User already in league |
| `TEAM_ALREADY_IN_LEAGUE` | Team already entered |

### H2H deferral

`LeagueType.HEAD_TO_HEAD` exists in the DB enum but is **not** usable:

- [`canCreateLeagueType`](../../src/modules/leagues/leagues.rules.ts) returns `false` for `HEAD_TO_HEAD` (intentional — not a bug)
- No `H2HFixture` model (roadmap: gameweekId, team1Id, team2Id, points, result)
- No H2H standings or pairing logic

Future H2H work requires product approval and a new migration for `H2HFixture`.

### Admin integration

[`admin/leagues/`](../../src/modules/admin/leagues/) — list, detail, member removal, league deletion; uses `computeLeagueStandings` for admin views; invalidates standings cache on moderation actions.

### Related modules

- [`leagues/`](../../src/modules/leagues/) — service, repository, rules, validation, controller, routes
- [`leagueGuards.ts`](../../src/modules/leagues/leagueGuards.ts) — `assertLeagueMember` for protected endpoints
- [`standings.calculator.ts`](../../src/modules/leagues/standings.calculator.ts) — re-exports ranking helpers

---

## Admin & audit tables (Phase 8)

Phase 8 was closed retroactively: `AuditLog` and `AlertConfig` pre-existed in migrations `20260702172043` and `20260703200000`. Admin Phases 3–9 wire all mutating routes through [`logAdminAction`](../../src/modules/admin/audit/auditLog.service.ts); Phase 7 adds webhook alerts via [`alert.service.ts`](../../src/modules/admin/system/alert.service.ts).

### AuditLog

| Field | Type | Purpose |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `adminId` | `String` FK → `User` | Admin who performed the action |
| `action` | `String` | e.g. `USER_SUSPEND`, `PLAYER_UPDATE`, `RECALCULATE_COMMIT` |
| `targetType` | `String` | e.g. `User`, `Player`, `Scoring`, `League` |
| `targetId` | `String` | Affected entity id |
| `beforeJson` | `Json` | Snapshot before change |
| `afterJson` | `Json?` | Snapshot after change (`null` on hard delete) |
| `createdAt` | `DateTime` | When logged |

**Indexes:** `(targetType, targetId)`, `(adminId, createdAt)`, `createdAt`.

**Behavior:** append-only; written inside the same `prisma.$transaction` as the mutation. List API: `GET /api/admin/audit` with filters on `adminId`, `action`, `targetType`, date range.

### AlertConfig

| Field | Type | Purpose |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `webhookUrl` | `String` | Slack/Discord-compatible webhook (default `""`) |
| `alertType` | `AlertType` enum | `INGESTION_FAILURE`, `QUEUE_BACKUP`, `HIGH_ERROR_RATE` |
| `enabled` | `Boolean` | Whether alerts fire (default `false`) |
| `createdAt` / `updatedAt` | `DateTime` | Timestamps |

**Uniqueness:** one row per `alertType`. No FK relations — standalone config table.

**Delivery:** `sendAlert` reads config, respects Redis cooldown (`alert:sent:<type>`), POSTs to webhook. Triggered from ingestion failures, queue depth checks, and error-rate monitoring.

### Append-heavy table growth (deferred)

Both `AuditLog` and `PlayerGameweekStats` are append-heavy and rarely updated — good candidates for partitioning or archival once the app runs multiple seasons.

| Table | Strategy | Partition key |
|---|---|---|
| `AuditLog` | Range partition or cold archive | `createdAt` (yearly or per-season) |
| `PlayerGameweekStats` | Range partition by gameweek | `gameweekId` (natural season boundary via `Gameweek`) |

**When to implement:** revisit when either table exceeds ~10M rows or audit-viewer / stats queries show sustained latency degradation.

**Operational rules:**

- Never update audit rows in place — append-only accountability
- Archive rows older than N seasons to cold storage (S3 + Parquet, or a separate Neon branch) rather than deleting
- Native Postgres partitioning requires raw SQL in migrations; Prisma treats partitioned tables as regular models — no schema DSL for partition definitions

No partitioning migration until a second season is live and volume justifies the operational overhead.

---

## Query performance (Phase 9)

Phase 9 was closed retroactively: core indexes landed in `20260702190000`; composite `Player(position, price)` in `20260705101027`.

### Index coverage

| Migration | Indexes added |
|---|---|
| `20260702190000_phase9_performance_indexes` | `Gameweek.isCurrent`, `Player.price`, `Fixture` composites, `LeagueMembership.userId`, `Transfer(teamId, gameweekId)`, GIN trgm on `lower(Player.name)` |
| `20260705101027_player_position_price_index` | `Player(position, price)` — matches [`findPlayers`](../../src/modules/players/players.repository.ts) filter-by-position + sort-by-price |

The pg_trgm GIN index is migration-only (Prisma schema DSL cannot express it). Documented in [`database-structure.md`](database-structure.md).

### EXPLAIN ANALYZE baseline

Run locally after optional load seed:

```bash
npm run seed:loadtest   # optional — more realistic row counts
npm run db:explain      # runs prisma/scripts/explain-hot-paths.sql
```

**What to look for:** `Seq Scan` on large tables where an `Index Scan` or `Bitmap Index Scan` is expected; high `Buffers` read counts on hot paths.

**When to re-run:** after index migrations, before a new season, or when production `pg_stat_statements` shows regressions.

Do not commit EXPLAIN output — results vary by environment and volume.

### N+1 / include-chain audit

| Path | Verdict | Notes |
|---|---|---|
| [`teams.repository.findTeamWithSquad`](../../src/modules/teams/teams.repository.ts) | OK | One join query (`squad → player → realTeam`) + one batched `PlayerGameweekStats` query |
| [`leagues.repository.findMembersWithTeams`](../../src/modules/leagues/leagues.repository.ts) | OK | Single query with nested includes; standings uses 3 batched queries in [`computeLeagueStandings`](../../src/modules/leagues/leagues.service.ts) |
| [`transfers.repository.findTransfersByTeam`](../../src/modules/transfers/transfers.repository.ts) | Fixed | Resolves `gameweekId` by number first, then filters `(teamId, gameweekId)` — uses composite index |
| [`admin/analytics.mapPlayerCounts`](../../src/modules/admin/analytics/analytics.service.ts) | OK | `groupBy` + one `findMany` by player ids |
| [`gameweekFinalization.job`](../../src/jobs/gameweekFinalization.job.ts) | Defer | Per-league loop; batch `updateMany` only if league count grows large |

Prisma nested `include` on a single `findMany`/`findUnique` emits JOINs, not N+1. N+1 risk is looping with `await prisma.*` inside the loop — none found on user-facing hot paths.

### Production monitoring

See [`database-structure.md`](database-structure.md) § Production query monitoring for `pg_stat_statements` on Neon.

---

## Neon connection strategy

| Variable | Connection | Used by |
|---|---|---|
| `DATABASE_URL` | Pooled (`-pooler` hostname on Neon) | Running app via `PrismaClient` in [`src/config/db.ts`](../../src/config/db.ts) |
| `DIRECT_URL` | Direct (no pooler) | `prisma migrate` only |

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**Local dev (Docker Compose):** `DIRECT_URL` may equal `DATABASE_URL` — pooling is a Neon serverless concern; local Postgres has no PgBouncer pooler.

**Why two URLs:** Neon's connection pooler (PgBouncer) does not support all operations Prisma migrations require (e.g. advisory locks). Migrations must use the direct connection.

**Validation:** On Neon, the pooled host contains `-pooler`; the direct host does not. Both use the same credentials and database name.

### Idle disconnect mitigation (P1017)

Neon can close pooled connections server-side during idle periods — especially on the free/scale-to-zero tier where compute suspends after inactivity. Prisma may then reuse a stale socket and fail with **P1017** ("Server has closed the connection") or **P1001** ("Can't reach database server") on the first query after wake.

**Mitigation (no Neon plan change required for correctness):**

| Layer | Setting | Purpose |
|---|---|---|
| Pooled `DATABASE_URL` | `pgbouncer=true` | Prisma compatibility with Neon's transaction-mode PgBouncer |
| Pooled `DATABASE_URL` | `connection_limit=5` | Cap per-process Prisma pool; fewer stale sockets against the pooler |
| Pooled `DATABASE_URL` | `connect_timeout=15` | Allow Neon compute cold-start time before failing |
| App runtime | Global Prisma `$extends` retry in [`src/lib/prismaRetryExtension.ts`](../../src/lib/prismaRetryExtension.ts) | Retry P1017/P1001/P1008 with exponential backoff (no `$disconnect` — that breaks interactive transactions) |
| Ledger / finance writes | [`src/lib/retryTransaction.ts`](../../src/lib/retryTransaction.ts) | Retry entire `prisma.$transaction` callbacks on P1017/P1001/P1008/P2028; idempotency keys make deposit/withdrawal retries safe |

**Interactive transactions:** Do not call `prisma.$disconnect()` inside per-query retry logic while a `$transaction` callback is running — Neon pooler disconnects invalidate the transaction client and surface **P2028**. Use service-level `retryTransaction()` for ledger writes instead.

**Trade-off:** Scale-to-zero adds latency on the first request after idle (compute wake). Upgrading to a paid always-on Neon compute reduces wake latency but does **not** remove the need for pooler params and client retry — idle disconnects can still occur at the PgBouncer layer.

---

## Migrations discipline

**14 migrations** applied as of Phase 10 close (from `20260701142400_init` through `20260705101027_player_position_price_index`).

### Workflow by environment

| Environment | Command | Connection |
|---|---|---|
| Local dev | `npm run prisma:migrate` (`migrate dev`) | `DIRECT_URL` from `.env` |
| CI / staging / prod | `npm run prisma:migrate:deploy` | `DIRECT_URL` from host secrets |
| Pre-deploy check | `npm run prisma:migrate:status` | `DIRECT_URL` |
| Tests | `prisma db push` in [`tests/globalSetup.js`](../../tests/globalSetup.js) | Ephemeral embedded Postgres |

### Rules

- **Never edit an already-applied migration file** — always create a new one (`prisma migrate dev --name …`).
- One migration per logical schema change; review SQL in `prisma/migrations/*/migration.sql` before merge.
- Run `npm run prisma:migrate:status` before every staging/prod deploy.
- **Test on staging Neon branch first** — see [`ops-environments.md`](ops-environments.md).
- Optional safety net: `npm run db:backup` before risky migrations — see [`ops-backup-restore.md`](ops-backup-restore.md).

### Backward-compatible migration patterns

- Add nullable column → backfill in app or SQL → enforce `NOT NULL` in a follow-up migration
- Add index `CONCURRENTLY` via raw SQL migration on large tables during live season (avoid blocking writes)
- Avoid renaming columns in one step — add new column, dual-write, migrate reads, drop old column

---

## Migration rollback

Prisma has **no automatic down migration**. Choose the least destructive option:

| Scenario | Action |
|---|---|
| `migrate deploy` failed mid-transaction (Postgres rolled back) | Fix migration SQL or schema; `prisma migrate resolve --rolled-back <migration_name>`; redeploy fixed migration |
| Migration applied but app logic broken | **Preferred:** new forward-fix migration reverting the schema change |
| Data corruption or bad deploy | **Neon PITR:** restore branch to timestamp before deploy; redeploy previous app version — [`ops-backup-restore.md`](ops-backup-restore.md) |
| Planned risky change | `npm run db:backup` on staging/prod via `DIRECT_URL` immediately before deploy |

Do not run `prisma migrate reset` against staging or production (drops all data).

---

## Cache sync (Phase 11)

Phase 11 was closed retroactively: Redis cache-aside (`src/lib/cache.ts`), React Query invalidation in mutation/live hooks, and Socket.IO league standings sync were built incrementally with Backend Phases 2–8 and Roadmap Phase 9.

**Phase 11 audit (completed):** cross-track cache-sync verification against [`database-structure.md`](database-structure.md) §5–6. **P0 fixes:** `syncAll` now flushes `players:list:*` and `fixtures:list:*` after each internal sync step; admin `updatePlayer` / `updateFixture` flush list caches after Postgres write. **P1:** doc reconciled to match live code (code is source of truth for key names).

**Pattern:** invalidate Redis on write → return fresh HTTP JSON and/or emit socket event → frontend `queryClient.invalidateQueries` with matching keys.

**Standings sync helpers:**

- `invalidateStandingsForTeam(teamId)` — called after user transfers; clears Redis for all leagues the team belongs to and emits `standings:updated` to `league:{leagueId}` rooms.
- `invalidateAllStandingsWithBroadcast()` — admin scoring recalculation/correction and scoring job.
- Frontend: `useLiveLeagueStandings` + `queryKeys.leagueStandings`; `useCreateLeague` / `useJoinLeague` / `useSubmitTransfers` invalidate `['leagueStandings', leagueId]` on success.

Full reference: [`cache-sync.md`](cache-sync.md); key/room map in [`database-structure.md`](database-structure.md) §5–6.

### Redis infrastructure (local dev vs production)

**Local development:** BullMQ requires Redis ≥ 5.0 (6.2+ recommended). Native `winget install Redis.Redis` (3.0.504) is **not** sufficient — it fails BullMQ’s version check and must not be used for job queues.

**Current local setup (2026-07-06):**

| Component | Detail |
|-----------|--------|
| Redis | Portable [Redis 5.0.14.1](https://github.com/tporadowski/redis/releases) in `.redis-local/`, bound to `localhost:6380` |
| `REDIS_URL` | `redis://localhost:6380` (port 6380 avoids conflict with the legacy Redis 3 Windows service on 6379) |
| `ENABLE_BULLMQ` | `true` — workers and repeatable jobs operational |
| Docker Desktop | Installed; `docker compose up -d redis` (Redis 7) is the **target** setup once WSL 2 is enabled (requires administrator install: `wsl --install`) |

Start Redis before `npm run dev`:

```powershell
npm run redis:dev
```

**BullMQ jobs verified:** `bootstrap-sync` (ingestion cron), `price-change`, `deadline-reminder`, `live-stats` workers register on startup; scheduled `bootstrap-sync` and `price-change` jobs fired and logged completion.

**Phase 11 cache-sync (complete):** Manual `syncPlayers()` invalidation confirmed earlier. Scheduled path confirmed: `bootstrap-sync` BullMQ job ran `syncPlayers()` → `players:list:*` keys cleared in Redis after the job (not via manual script).

**Production (Backend Phase 10 deployment):** A managed Redis service ≥ 6.2 (e.g. Upstash, Redis Cloud) will be chosen during deployment planning — **not** a self-managed container. `REDIS_URL` will point at that service; BullMQ and cache-aside share the same connection.
