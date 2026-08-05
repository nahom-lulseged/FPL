# How to use the FPL API in Postman

Public Fantasy Premier League API: `https://fantasy.premierleague.com/api/`.  
Most GETs need **no login**—only path variables.

## Import (one-time)

1. Open Postman → **Import**.
2. Import:
   - [`fpl-api.postman_collection.json`](./fpl-api.postman_collection.json)
   - [`fpl-api.postman_environment.json`](./fpl-api.postman_environment.json)
3. Top-right environment dropdown → select **FPL Public API**.

## Variables

| Variable | Meaning | How to find it |
|----------|---------|----------------|
| `team_id` | FPL entry / manager ID | Team page URL: `fantasy.premierleague.com/entry/XXXXXXXX/...` |
| `gw_id` | Gameweek number (`1`–`38`) | Bootstrap Static → `events` where `is_current: true` |
| `player_id` | Player / element ID | Bootstrap Static → `elements[].id` |
| `league_id` | Classic league ID | `314` = Overall |

Pre-filled smoke-test values (verified):

- `team_id` = `3027768` (Overall #1 sample entry)
- `gw_id` = `38` (current gameweek at last check)
- `player_id` = `1` (Raya)
- `league_id` = `314`

Replace `team_id` with your own entry ID when you want your squad.

## Gameweek Picks

**URL:** `GET {{base_url}}/entry/{{team_id}}/event/{{gw_id}}/picks/`

1. Open **Fantasy Premier League API** → **Gameweek Picks**.
2. Confirm environment variables `team_id` and `gw_id` are set.
3. Click **Send**.

### What to inspect in the response

- `picks[]` — 15 slots; `element`, `position`, `is_captain`, `is_vice_captain`, `multiplier` (`0` = bench)
- `entry_history` — GW points, transfers, hit cost
- `active_chip` — chip used that GW (or `null`)

### Verified example (entry `3027768`, GW `38`)

| Field | Value |
|-------|-------|
| `active_chip` | `null` |
| `entry_history.points` | `76` |
| `entry_history.total_points` | `2582` |
| `entry_history.event_transfers` | `2` |
| `picks_count` | `15` |
| Captain | `element=449`, `multiplier=2` |
| Vice | `element=624` |
| Bench | positions `12`–`15` (`multiplier=0`) |

## Smoke test order

1. **Bootstrap Static** — note current `gw_id` and a `player_id`.
2. **Gameweek Fixtures** — with that `gw_id`.
3. **Gameweek Picks** — with any public `team_id` + that `gw_id`.
4. **Element Summary** — with a `player_id` from step 1.

## Auth / headers

- No FPL login required for public team picks.
- Collection sends `User-Agent: FPL-Clone-Backend/0.1` (same as backend).
- Avoid rapid repeated calls (rate limits / blocks).

## Relation to this repo

[`fpl-backend/src/modules/ingestion/fpl.client.ts`](../../fpl-backend/src/modules/ingestion/fpl.client.ts) calls:

- `/bootstrap-static/` → `fetchBootstrapStatic()`
- `/fixtures/` → `fetchFixtures()`
- `/event/{gw}/live/` → `fetchGameweekLive()`
- `/element-summary/{id}/` → `fetchElementSummary()` (player GW history + past seasons)

Element summary is synced on demand when `GET /api/players/:id` is stale (or via admin “Sync element summary” / backfill job). History lands in `PlayerGameweekStats` + `PlayerSeasonHistory`.

**Gameweek Picks**, Entry Details/Summary/History/Transfers, and official League Standings are **not** used by the backend; your app stores squads, transfers, and leagues in its own DB. Use those Postman requests mainly to inspect official FPL shapes or debug against real data.
