# Solution — Rotating Exposed Credentials

Your `.env` was pasted into this chat, which means the Neon database password and JWT secrets in it should be treated as **compromised**, even though nothing malicious has happened. This is a mechanical fix — 15-20 minutes of work. Do it before Phase 10 deployment, ideally now.

---

## Step 1 — Rotate the Neon database password

1. Go to the [Neon Console](https://console.neon.tech) → your project → **Settings → Roles**.
2. Select the `neondb_owner` role → **Reset password**.
3. Neon will generate a new password and give you an updated connection string immediately.
4. Copy both the new **pooled** connection string and the new **direct** connection string (Neon shows both — the pooled one has `-pooler` in the hostname, matching what you already have).

> Resetting the password immediately invalidates the old one — any connection using the old string will fail after this step, which is the point.

## Step 2 — Generate new JWT secrets

Your current values (`change-me-in-production`, `change-me-in-production-too`) were always placeholders, but generate real random secrets now regardless:

```bash
# Run this twice — once for JWT_SECRET, once for JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use two **different** 128-character hex strings — never reuse the same value for both.

## Step 3 — Update your local `.env`

```properties
DATABASE_URL=<new pooled connection string from Neon>
DIRECT_URL=<new direct connection string from Neon>
REDIS_URL=redis://localhost:6379
JWT_SECRET=<new random secret from Step 2>
JWT_REFRESH_SECRET=<new different random secret from Step 2>
PORT=3000
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
ENABLE_INGESTION_CRON=false
ENABLE_SCORING_CRON=false
```

Note: add `DIRECT_URL` now if it isn't already in your Prisma schema's datasource block — see `database-structure.md` for why you need both.

## Step 4 — Confirm `.env` is actually gitignored

```bash
git check-ignore -v .env
```

If this prints nothing, `.env` is **not** ignored and may already be committed. Check:

```bash
git log --all --full-history -- .env
```

If any commit shows up, the file is in your git history even if you delete it now — deleting the file alone doesn't remove it from history. If that's the case:
- If the repo is private and only you've ever cloned it: rotating the password (Step 1) already neutralizes the risk — the exposed value is now dead.
- If the repo is or will be public: use `git filter-repo` (or BFG Repo-Cleaner) to strip `.env` from history before making it public, then force-push.

## Step 5 — Invalidate existing sessions (optional but clean)

Since `JWT_SECRET` changed, every previously-issued access/refresh token is now automatically invalid — anyone (including your own test sessions) will need to log in again. This is a natural side effect of Step 2, not something you need to do manually. Just be aware your own browser sessions will now require re-login.

## Step 6 — Move secrets out of `.env` for anything beyond localhost

`.env` files are fine for local development. Once you deploy:
- **Backend host** (Railway/Render/AWS/etc.): use its built-in environment variable / secrets manager UI, not a committed file.
- **Vercel/Netlify (frontend)**: same — use their dashboard's environment variables section.
- Keep `.env.example` in the repo (with placeholder values only) so contributors know what variables are needed, but never commit real values.

## Step 7 — Quick prevention going forward

- Add a pre-commit secret scanner so this can't happen again silently: [gitleaks](https://github.com/gitleaks/gitleaks) is a good lightweight option — one config file, runs in a git hook or CI.
- When pasting config into a chat/ticket/Slack in the future, redact the password segment manually (`postgresql://user:***@host/db`) before sharing — habit, not tooling, is the real fix here.

---

## Checklist

- [ ] Neon password reset, new connection strings copied
- [ ] New `JWT_SECRET` and `JWT_REFRESH_SECRET` generated (different values)
- [ ] Local `.env` updated with new values
- [ ] `DIRECT_URL` added to `.env` and `schema.prisma` datasource block
- [ ] Confirmed `.env` is gitignored (`git check-ignore -v .env` returns a result)
- [ ] Checked git history for accidental `.env` commits
- [ ] Secrets moved to hosting provider's secret manager for any deployed environment
- [ ] (Optional) gitleaks or similar added as a pre-commit hook
