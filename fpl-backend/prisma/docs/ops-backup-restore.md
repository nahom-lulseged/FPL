# Backup & Restore — FPL Clone

Operational guide for Neon PITR and manual `pg_dump` backups. Complements [`decisions.md`](decisions.md) § Migration rollback.

---

## When to use which recovery path

| Data type | Primary recovery | Notes |
|---|---|---|
| User teams, squads, transfers, leagues | **Neon PITR** or manual restore | Not re-creatable from FPL API |
| Reference data (players, fixtures, gameweeks) | Re-ingestion via `npm run ingest` | Acceptable fallback if user data unaffected |
| Pre-migration safety net | `npm run db:backup` | Snapshot before risky migrations on staging/prod |

**PITR is the primary production recovery path.** Manual dumps are for pre-deploy snapshots and local/staging drills.

---

## Neon console checklist (confirm before prod)

1. Open **Neon console → Project → Settings → Restore**
2. Note your **plan tier** and **PITR retention window** (varies by tier; check current Neon docs for Free vs Scale/Pro)
3. Confirm **history retention** meets your RPO target (how much data loss is acceptable)
4. Record the restore window in your runbook (e.g. "7 days PITR on Scale")

If retention is too short for your needs, upgrade tier or schedule periodic `npm run db:backup` to external storage.

---

## Restore drill (run once before production)

Validates that you can recover without guessing during an incident.

1. **Pick a timestamp** a few minutes in the past (or use "Create branch from parent" in Neon)
2. In Neon: **Branches → Create branch** → choose **Point in time** or branch from `main`
3. Copy the new branch's **direct** connection string → set as `DIRECT_URL` temporarily
4. Verify schema state:
   ```bash
   npm run prisma:migrate:status
   ```
5. Point a local app or smoke script at the branch's pooled URL; hit `GET /api/players` or health endpoint
6. Delete the drill branch when done (avoid orphaned cost)

Document the drill date and outcome in your team notes.

---

## Manual backup (`pg_dump`)

Uses `DIRECT_URL` from `.env` (unpooled connection required for dump consistency).

```bash
npm run db:backup
```

Output: `backups/fpl-YYYYMMDD-HHMM.sql` (gitignored).

**Requirements:** `pg_dump` on PATH (PostgreSQL client tools, or Docker Postgres image).

**When to run:**

- Before a risky migration on staging or production
- Before bulk admin data corrections
- Periodic archival if PITR window is shorter than your retention needs

---

## Manual restore

```bash
npm run db:restore -- backups/fpl-20260705-1200.sql
```

**Warning:** Restoring a plain SQL dump may `DROP` and recreate objects. Use only on:

- Local Docker Postgres
- A disposable Neon staging branch
- After explicit confirmation (script prompts for `yes`)

For production incidents, prefer **Neon PITR branch restore** over overwriting `main` with `psql`.

---

## Neon PITR restore (production incident)

1. Neon console → **Restore** or **Create branch from point in time**
2. Select timestamp **before** the bad deploy/migration
3. Options:
   - **New branch:** test the restored data, then swap connection strings to make it production
   - **Restore main:** overwrites main branch (destructive — confirm in console)
4. Deploy the **previous app version** that matches the restored schema if migrations were involved
5. Run `npm run prisma:migrate:status` on the restored database

See [`ops-environments.md`](ops-environments.md) for branch naming conventions.

---

## Related

- [`ops-environments.md`](ops-environments.md) — staging branch workflow
- [`ops-secrets.md`](ops-secrets.md) — credential rotation after restore/swap
- [`decisions.md`](decisions.md) § Migration rollback
