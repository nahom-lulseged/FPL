# Backend Skill Map — FPL Clone

## Core (needed from day 1)
- **Node.js + TypeScript**: async/await, error handling patterns, module structure
- **Express (or NestJS)**: routing, middleware, controllers/services separation
- **REST API design**: resource naming, status codes, pagination, filtering
- **PostgreSQL**: relational modeling, joins, indexes, constraints
- **Prisma ORM** (or TypeORM/Drizzle): schema definition, migrations, query building

## Data Modeling (Phase 0)
- Designing many-to-many relationships (Squad ↔ Players, League ↔ Users)
- Modeling time-series-like data (per-gameweek stats) efficiently
- Normalization vs denormalization trade-offs (e.g. caching computed points vs recalculating)

## Auth & Security (Phase 1)
- **JWT**: access/refresh token strategy, token rotation
- **Password hashing**: bcrypt/argon2
- **Middleware patterns**: auth guards, role-based access control
- **Rate limiting**: express-rate-limit or Redis-backed limiter
- **Input validation**: Zod or Joi schemas on every endpoint

## Data Ingestion (Phase 2)
- Consuming a third-party REST API (the official FPL API) — pagination, error handling, retries
- **Scheduled jobs**: node-cron or BullMQ repeatable jobs
- Data transformation/ETL basics: mapping external API shape to your own schema
- Idempotent upserts (so re-running ingestion doesn't duplicate data)

## Domain Logic / Business Rules (Phases 3–6) — the heart of this project
- Translating real-world rules into code: squad composition limits, budget constraints, formation rules
- **Scoring engine design**: rule tables, pure functions for testability, versioning rules per season
- State machines: modeling chip usage (used/unused/active), transfer windows, gameweek lifecycle (upcoming → live → finished)
- Handling **edge cases**: postponed fixtures, doubled gameweeks, blank gameweeks, auto-substitutions

## Leagues & Aggregation (Phase 7)
- Efficient aggregate queries (SUM/GROUP BY for standings) — or precomputed/cached standings
- Designing invite-code/join-flow systems
- Head-to-head fixture scheduling algorithms (round-robin generation)

## Real-time (Phase 8)
- **WebSockets (Socket.IO)**: rooms/namespaces per gameweek or league, broadcasting efficiently
- **Pub/Sub with Redis**: fan-out live updates across multiple server instances
- Designing for eventual consistency during live scoring windows

## Performance & Caching (Phase 9)
- **Redis caching strategies**: cache-aside, TTL tuning, cache invalidation on writes
- Database indexing and query plan analysis (`EXPLAIN ANALYZE`)
- Connection pooling, N+1 query avoidance (Prisma `include` vs multiple queries)

## Testing & Reliability (Phase 10)
- **Unit testing** (Jest/Vitest): especially the scoring engine and squad validators
- **Integration testing**: Supertest for endpoint testing against a test DB
- Contract testing if frontend/backend are built by different people/teams
- Structured logging and basic observability (request IDs, error tracking with Sentry)

## DevOps basics
- Docker & Docker Compose for local dev parity
- CI/CD (GitHub Actions): lint → test → build → migrate → deploy
- Environment/secrets management
- Basic load testing (k6 or Artillery) on hot endpoints

## Recommended learning order
1. Express/NestJS + Prisma + Postgres → CRUD basics
2. Auth (JWT) → secure endpoints
3. Data ingestion + cron jobs → real player/fixture data flowing in
4. Domain rules (squad validation) → the FPL-specific logic starts here
5. Scoring engine → the most complex and most important piece
6. Leagues/aggregation → social features
7. WebSockets + Redis → live gameweek experience
8. Testing, caching, deployment → production hardening
