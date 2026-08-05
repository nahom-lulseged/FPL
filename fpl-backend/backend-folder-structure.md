# Backend Folder Structure — FPL Clone

```
fpl-backend/
├── prisma/
│   ├── schema.prisma                # DB schema: User, Team, Player, Fixture, League, etc.
│   ├── migrations/
│   └── seed.ts                      # seed script (initial players/teams/fixtures)
│
├── src/
│   ├── index.ts                      # app entrypoint
│   ├── app.ts                        # express app setup, middleware registration
│   ├── config/
│   │   ├── env.ts                     # env var validation/loading
│   │   ├── db.ts                      # Prisma client instance
│   │   └── redis.ts                   # Redis client instance
│   │
│   ├── modules/                      # feature-based organization
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validation.ts
│   │   ├── players/
│   │   │   ├── players.controller.ts
│   │   │   ├── players.service.ts
│   │   │   ├── players.routes.ts
│   │   │   └── players.repository.ts
│   │   ├── teams/
│   │   │   ├── teams.controller.ts
│   │   │   ├── teams.service.ts
│   │   │   ├── teams.routes.ts
│   │   │   └── squadValidator.ts       # budget/position/club-limit rules
│   │   ├── transfers/
│   │   │   ├── transfers.controller.ts
│   │   │   ├── transfers.service.ts
│   │   │   └── transfers.routes.ts
│   │   ├── chips/
│   │   │   ├── chips.controller.ts
│   │   │   ├── chips.service.ts
│   │   │   └── chips.routes.ts
│   │   ├── scoring/
│   │   │   ├── scoring.engine.ts       # pure functions: stats -> points
│   │   │   ├── scoring.rules.ts        # rule constants (goals=X pts, etc.)
│   │   │   ├── autoSubstitution.ts
│   │   │   └── scoring.job.ts          # job that runs engine per gameweek
│   │   ├── fixtures/
│   │   │   ├── fixtures.controller.ts
│   │   │   ├── fixtures.service.ts
│   │   │   └── fixtures.routes.ts
│   │   ├── gameweeks/
│   │   │   ├── gameweeks.controller.ts
│   │   │   ├── gameweeks.service.ts
│   │   │   └── gameweeks.routes.ts
│   │   ├── leagues/
│   │   │   ├── leagues.controller.ts
│   │   │   ├── leagues.service.ts
│   │   │   ├── leagues.routes.ts
│   │   │   └── standings.calculator.ts
│   │   └── ingestion/
│   │       ├── ingestion.service.ts    # pulls from external FPL API
│   │       ├── ingestion.job.ts        # scheduled sync job
│   │       └── mappers.ts              # external API shape -> internal schema
│   │
│   ├── middleware/
│   │   ├── authGuard.ts
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── validateRequest.ts
│   │
│   ├── sockets/
│   │   ├── socketServer.ts             # Socket.IO setup
│   │   └── liveScores.gateway.ts       # emits live score events
│   │
│   ├── jobs/
│   │   ├── queue.ts                     # BullMQ queue setup
│   │   ├── priceChange.job.ts
│   │   └── deadlineReminder.job.ts
│   │
│   ├── lib/
│   │   ├── logger.ts
│   │   ├── cache.ts                     # Redis cache-aside helpers
│   │   └── constants.ts
│   │
│   └── types/
│       └── index.d.ts
│
├── tests/
│   ├── unit/
│   │   ├── scoring.engine.test.ts
│   │   └── squadValidator.test.ts
│   └── integration/
│       ├── auth.test.ts
│       └── transfers.test.ts
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── tsconfig.json
└── package.json
```

**Notes**
- Organized by **feature module** (not by layer-only) so each domain area (teams, scoring, leagues) is self-contained and easy to navigate.
- `scoring/` is isolated and framework-agnostic — it should be pure functions, unit tested heavily, since it's the piece most likely to have subtle bugs.
- `ingestion/` keeps external API dependency contained — if you ever switch data sources, only this module changes.
- `sockets/` and `jobs/` are separated from HTTP `modules/` since they run on different triggers (events/cron vs HTTP requests).
