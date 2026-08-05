# Secrets Hygiene — FPL Clone

Checklist for rotating and storing credentials. Actual rotation is a **manual** ops task in Neon and your hosting provider.

---

## Secret inventory

| Secret | Used by | Store in prod |
|---|---|---|
| `DATABASE_URL` | App (`PrismaClient`) | Neon console → host env / secret manager |
| `DIRECT_URL` | Migrations, `db:backup` | Neon console → CI/deploy secrets only (not app runtime if avoidable) |
| `REDIS_URL` | Cache, BullMQ, refresh tokens | Upstash/Railway Redis → host secrets |
| `JWT_SECRET` | Access tokens | Host secret manager |
| `JWT_REFRESH_SECRET` | Refresh token signing | Host secret manager |
| Alert webhook URLs | `AlertConfig` table | Postgres (admin UI); HTTPS required when `enabled` |

---

## Rotate immediately if exposed

Treat as compromised if a secret appeared in:

- Chat, email, or support tickets
- Git history (even if later removed)
- Logs, error reports, or screenshots
- Committed `.env` (`.env` is gitignored — verify with `git check-ignore -v .env`)

---

## Rotation checklist

### 1. Neon database password

1. Neon console → **Project → Settings → Reset password**
2. Update **both** pooled and direct connection strings (password embedded in URL)
3. Update host secrets: `DATABASE_URL`, `DIRECT_URL`
4. Redeploy app and any CI jobs that run migrations
5. Revoke old connections (Neon resets handle this on password change)

### 2. JWT secrets

1. Generate new random strings (e.g. `openssl rand -base64 32`)
2. Update `JWT_SECRET` and `JWT_REFRESH_SECRET` in host secrets
3. Redeploy — **all users must log in again** (expected)

### 3. Redis

1. Rotate password in Redis provider console
2. Update `REDIS_URL` in host secrets
3. Redeploy — refresh tokens in Redis are invalidated (users re-login)

### 4. Alert webhooks

1. Regenerate webhook URL in Slack/Discord
2. Update via admin **Alert Settings** UI or direct DB update on staging first

---

## Production storage rules

- **Never** commit `.env` — use [`.env.example`](../../.env.example) as a template only
- **Never** paste production URLs into issues or chat
- Use host **secret manager** (Railway Variables, Render Secret Files, Fly secrets, etc.)
- Staging secrets: separate Neon branch credentials — see [`.env.staging.example`](../../.env.staging.example)
- CI: inject secrets via GitHub Actions encrypted secrets (when CI is added in Backend Phase 10)

---

## Local development

- Copy `.env.example` → `.env` for local values
- Default Docker credentials (`fpl`/`fpl`) are fine for localhost only
- Do not reuse production passwords locally

---

## Related

- [`ops-environments.md`](ops-environments.md) — per-environment URLs
- [`ops-backup-restore.md`](ops-backup-restore.md) — recovery after credential incident
- [`database-structure.md`](database-structure.md) § Environment separation
