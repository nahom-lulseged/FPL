# Backend Roadmap — FPL Clone

**Assumed stack:** Node.js + Express (or NestJS), TypeScript, PostgreSQL, Prisma ORM, Redis (caching + pub/sub), Socket.IO, JWT auth, BullMQ (background jobs), Docker.

> The official FPL public API (`fantasy.premierleague.com/api/`) is a great data source for real player/fixture/points data if you don't want to hand-enter it — many clones use it as an ingestion source.

---

## Phase 0 — Setup & Data Modeling (Week 1)
- [ ] Init Node + TypeScript + Express project
- [ ] Set up PostgreSQL + Prisma, define initial schema
- [ ] Design core tables: `User`, `Team`, `Squad`, `Player`, `RealTeam`, `Fixture`, `Gameweek`, `PlayerGameweekStats`, `League`, `LeagueMembership`, `Transfer`, `ChipUsage`
- [ ] Set up environment config, Docker Compose (Postgres + Redis + app)
- [ ] Set up logging (pino/winston) and error handling middleware

## Phase 1 — Auth (Week 2)
- [ ] User registration/login with hashed passwords (bcrypt/argon2)
- [ ] JWT access + refresh token flow
- [ ] Password reset flow (email token)
- [ ] Rate limiting on auth endpoints
- [ ] Middleware for route protection & role checks (admin vs user)

## Phase 2 — Player & Fixture Data Ingestion (Weeks 3–4)
- [ ] Build ingestion job to pull player list, teams, fixtures (from FPL API or manual seed data)
- [ ] Store per-gameweek player stats (minutes, goals, assists, cards, bonus, price)
- [ ] Scheduled job (cron/BullMQ) to refresh prices and stats
- [ ] Endpoint: `GET /players` with filters (position, team, price range, search)
- [ ] Endpoint: `GET /fixtures` with gameweek filter and FDR calculation

## Phase 3 — Squad Management (Week 5)
- [ ] `POST /teams` — create initial 15-man squad (validate budget £100m, 2 GK/5 DEF/5 MID/3 FWD, max 3 per real club)
- [ ] `GET /teams/:id` — fetch current squad with live/confirmed points
- [ ] `PATCH /teams/:id/captain` — set captain/vice-captain
- [ ] `PATCH /teams/:id/lineup` — set starting XI + formation validation
- [ ] Squad validation service (shared rules module, reused by transfers/chips)

## Phase 4 — Scoring Engine (Weeks 6–7)
- [ ] Core scoring rules module (goals, assists, clean sheets, cards, saves, bonus points system — BPS)
- [ ] Job that calculates points per player per gameweek once match data is ingested
- [ ] Auto-substitution logic (bench player subbed in if starter scores 0/doesn't play)
- [ ] Aggregate team gameweek score + running total
- [ ] Endpoint: `GET /teams/:id/gameweeks/:gw` — points breakdown

## Phase 5 — Transfers (Week 8)
- [ ] `POST /teams/:id/transfers` — process transfer(s), validate budget/rules
- [ ] Free transfer counter logic (accumulate up to 2, reset on wildcard)
- [ ] Points-hit calculation (-4 per transfer beyond free allowance)
- [ ] Transfer deadline enforcement (lock at gameweek deadline)
- [ ] Transfer history table + endpoint

## Phase 6 — Chips (Week 9)
- [ ] Chip state machine per team/season: Wildcard(x2), Free Hit, Bench Boost, Triple Captain
- [ ] Apply chip effects in scoring engine (bench boost adds bench points, triple captain 3x multiplier, free hit reverts squad next GW, wildcard removes transfer cost)
- [ ] Endpoint: `POST /teams/:id/chips/:chipType`

## Phase 7 — Leagues (Weeks 10–11)
- [ ] `POST /leagues` — create classic or head-to-head league
- [ ] `POST /leagues/:id/join` — join via invite code
- [ ] Standings calculation job (classic: total points; H2H: match points from head-to-head results)
- [ ] `GET /leagues/:id/standings`
- [ ] League gameweek fixture generator for H2H leagues

## Phase 8 — Live Updates & Jobs (Week 12)
- [x] WebSocket server (Socket.IO) broadcasting live score updates during matches
- [x] BullMQ jobs: price change calculator (nightly), deadline reminders, gameweek finalization
- [x] Provisional bonus points calculation during live matches

## Phase 9 — Caching & Performance (Week 13)
- [x] Redis caching for player list, fixtures, league standings (high read, low write)
- [x] Database indexing review (player search, gameweek stats lookups)
- [x] Pagination on all list endpoints
- [x] Load testing key endpoints (squad save, transfers, live score fan-out)

## Phase 10 — Testing, Security & Deployment (Week 14)
- [ ] Unit tests for scoring engine and squad validation (highest-risk logic)
- [ ] Integration tests for auth + transfer flows
- [ ] Input validation (Zod/Joi) on all endpoints
- [ ] CORS, helmet, rate limiting, SQL injection protection (Prisma handles most)
- [ ] CI/CD pipeline (lint, test, build, migrate, deploy)
- [ ] Deploy (Railway/Render/AWS ECS), managed Postgres + Redis
- [ ] API docs (OpenAPI/Swagger)

---

## Suggested build order priority
**Auth → Data ingestion → Squad management → Scoring engine → Transfers → Leagues → Chips → Live updates → Caching/hardening**

The scoring engine is the highest-complexity, highest-value piece — budget the most review/testing time there.
