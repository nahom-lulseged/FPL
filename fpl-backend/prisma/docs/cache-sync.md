# Cache sync — Redis ↔ React Query (Phase 11)

Every mutation that changes cached data must **invalidate Redis first**, then tell the frontend to refresh React Query — either via the mutation HTTP response (user-initiated actions) or a Socket.IO event (backend-driven changes such as live scoring, admin corrections, or another member's transfer).

See also [`database-structure.md`](database-structure.md) §5–6 for the key/room map.

---

## Read path (cache-aside)

```
GET /resource
  → buildCacheKey(namespace, queryParams)
  → redis.get(key)
      hit  → return JSON
      miss → query Postgres → redis.setex(key, ttl, JSON) → return JSON
```

Implemented in [`src/lib/cache.ts`](../../src/lib/cache.ts) (`getOrSet`, `buildCacheKey`, `invalidate`, `invalidateByPrefix`).

---

## Write path (invalidate, don't patch)

```
POST /mutation
  → write Postgres (source of truth)
  → delete matching Redis key(s) — never update cache in place
  → optional: emit Socket.IO event to scoped room
  → return fresh JSON in HTTP response
```

Frontend mutation hooks call `queryClient.invalidateQueries()` in `onSuccess` for the acting user. Socket listeners call the same invalidation for other viewers.

---

## `syncAll` invalidation sequence

[`syncAllInternal`](../../src/modules/ingestion/ingestion.service.ts) flushes list caches after each internal sync step (SCAN + DEL via `invalidateByPrefix`):

| After step | Redis prefix flushed |
|---|---|
| `syncRealTeamsInternal` | `players:list:*` |
| `syncPlayersInternal` | `players:list:*` |
| `syncGameweeksInternal` | `fixtures:list:*` |
| `syncFixturesInternal` | `fixtures:list:*` |
| `syncGameweekStats` | `standings:*` (existing) |

Standalone `syncPlayers` / `syncFixtures` wrappers also flush their prefix. Admin `updatePlayer` / `updateFixture` flush `players:list:*` / `fixtures:list:*` after the Postgres transaction.

---

## Key map (Redis ↔ React Query ↔ triggers)

| Resource | Redis key | TTL (defaults) | React Query key | Invalidated by |
|---|---|---|---|---|
| Player list | `players:list:{filterHash}` | 600s | `['players', filters]` | `syncPlayers`, `syncAll` (teams + players steps), admin `updatePlayer`, live `gw:stats:updated` / price events |
| Fixtures list | `fixtures:list:{filterHash}` | 600s | `['fixtures', filters]` | `syncFixtures`, `syncAll` (gameweeks + fixtures steps), admin `updateFixture`, live `gw:stats:updated` |
| League standings | `standings:{leagueId}:{filterHash}` | 30s live / 300s | `['leagueStandings', leagueId]` | Transfers, league create/join, scoring job, admin scoring, `standings:updated` socket |
| Team detail | *(uncached)* | — | `['team', teamId]` | Squad/lineup/captain mutations, transfers |
| Team GW score (live) | *(uncached — socket-driven)* | — | `['team', teamId, gameweek]` + `['teamGwBreakdown', teamId, gameweek]` | `team:score:updated` via `useLiveTeamScores` |
| Ingestion last sync | `ingestion:lastSync` (single key) | overwritten each run | `['ingestion', 'status']` (admin) | `recordIngestionSync` on `syncAll`; admin `useTriggerSync` |
| Admin dashboard | *(uncached — Postgres direct)* | — | `['dashboard', 'summary']` | 30s polling; `useTriggerSync` invalidates on manual sync |

Central frontend registry: [`fpl-frontend/src/lib/queryKeys.ts`](../../../fpl-frontend/src/lib/queryKeys.ts).

**Not implemented:** single player detail Redis, team score Redis, admin dashboard Redis — see [`database-structure.md`](database-structure.md) §5 footnote.

---

## Socket rooms and events

| Event | Room | Payload | Frontend hook |
|---|---|---|---|
| `gw:stats:updated` | `gw:{gameweekNumber}` | `{ gameweekNumber, updatedPlayerIds }` | `useLiveGameweek` |
| `team:score:updated` | `team:{teamId}` | `{ teamId, gameweekNumber, totalPoints, pointsStatus }` | `useLiveTeamScores` |
| `gw:finalized` | `gw:{gameweekNumber}` (+ broadcast) | `{ gameweekNumber }` | `useLiveNotifications` |
| `standings:updated` | `league:{leagueId}` | `{ leagueId }` | `useLiveLeagueStandings` |

Join rooms only while the relevant page is mounted (`join:league` / `leave:league` on standings page).

**Admin app:** no Socket.IO client — admin scoring corrections flush Redis and emit `standings:updated` for the consumer app; admin views rely on manual refresh or polling. This is acceptable for an internal tool.

Backend helpers:

- `invalidateStandingsForLeague(leagueId)` — Redis delete + socket emit
- `invalidateStandingsForTeam(teamId)` — all leagues for that team
- `invalidateAllStandingsWithBroadcast()` — admin/scoring full flush

---

## Debugging checklist

1. **Postgres** — Is the row correct? (`psql` / Prisma Studio)
2. **Redis** — Does the key still exist after the mutation? (`redis-cli SCAN` with pattern `standings:{leagueId}:*`)
3. **CACHE_ENABLED** — Is caching on in this environment?
4. **Socket** — Is the client in the right room? Did `standings:updated` fire?
5. **React Query** — Is the query key an exact match? Check DevTools stale/fetching state.

---

## Manual test (not automated)

1. Open league standings in two browser tabs as **different users** in the same league.
2. Make a transfer in tab A.
3. Tab B standings should refresh within the live-GW TTL window without a manual page reload.
