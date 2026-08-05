# Environments — FPL Clone

How local dev, staging, and production databases relate. Neon **database branching** is the recommended staging/prod split.

---

## Environment map

| Environment | Database | Connection vars | Migrations |
|---|---|---|---|
| Local dev | Docker Compose Postgres OR Neon dev branch | `.env` — `DATABASE_URL` = `DIRECT_URL` for Docker | `npm run prisma:migrate` |
| Test (CI) | Ephemeral embedded Postgres | Set by [`tests/globalSetup.js`](../../tests/globalSetup.js) | `prisma db push` |
| Staging | Neon branch (child of `main` or empty) | Host secrets or `.env.staging` (never commit) | `npm run prisma:migrate:deploy` |
| Production | Neon `main` branch | Host secret manager only | `npm run prisma:migrate:deploy` |

Template for staging env vars: [`.env.staging.example`](../../.env.staging.example).

---

## Create a Neon staging branch

1. Neon console → **Branches → Create branch**
2. **Source:** branch from `main` (copy prod schema + data) OR empty branch (clean slate)
3. For migration testing without prod data, prefer **empty branch** + `npm run seed` + ingestion
4. Copy connection strings from the branch dashboard:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL`
   - **Direct** (no `-pooler`) → `DIRECT_URL`
5. Configure staging app host (Railway/Render/Fly) with these values

**Naming:** `staging` or `preview-<feature>` — delete short-lived preview branches after merge.

---

## Pre-production migration flow

Always apply migrations to staging before production:

```bash
# 1. Optional snapshot
DIRECT_URL=<staging-direct> npm run db:backup

# 2. Deploy migrations to staging
DIRECT_URL=<staging-direct> DATABASE_URL=<staging-pooled> npm run prisma:migrate:deploy

# 3. Verify
DIRECT_URL=<staging-direct> npm run prisma:migrate:status
npm test

# 4. Deploy same migration to production (CI or manual)
DIRECT_URL=<prod-direct> DATABASE_URL=<prod-pooled> npm run prisma:migrate:deploy

# 5. Deploy app
```

---

## Staging data policy

- **Do not** copy production user PII into staging unless required for a specific debug (then delete branch after)
- Seed reference data: `npm run seed` and/or `npm run ingest`
- Load test users: `npm run seed:loadtest` (staging only)

---

## URL validation (Neon)

| Variable | Host pattern |
|---|---|
| `DATABASE_URL` | Contains `-pooler` (e.g. `ep-xxx-pooler.region.aws.neon.tech`) |
| `DIRECT_URL` | Same project, **no** `-pooler` in hostname |

Local Docker: both URLs are identical (`postgresql://fpl:fpl@localhost:5432/fpl`).

---

## Related

- [`ops-backup-restore.md`](ops-backup-restore.md) — PITR and manual backup
- [`ops-secrets.md`](ops-secrets.md) — secrets per environment
- [`database-structure.md`](database-structure.md) § Environment separation
