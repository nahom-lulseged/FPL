# Deployment guide

This repository deploys the Express/Prisma backend to Render and the Vite React frontend to Vercel. Configure Telegram through BotFather only after both HTTPS deployments are reachable.

## 1. Deploy the backend first

Create or synchronize the Render Blueprint from `fpl-backend/render.yaml` (select that custom Blueprint path when linking the repository). Both Node services declare `rootDir: fpl-backend`, so their build and start commands run against the backend package rather than the monorepo root. It defines:

- `fpl-api`: the public web service, started with `npm start`.
- `fpl-worker`: the background worker, started with `npm run start:worker`.
- `fpl-key-value`: the shared managed Redis-compatible service.

The Blueprint currently uses Render's `free` plans so staging and Telegram Mini App testing can proceed without paid Render instances. Free plans are acceptable for early staging only: expect cold starts, sleep behavior, and tighter CPU, memory, and service limits. Before real users or payments, move `fpl-api`, `fpl-worker`, and `fpl-key-value` back to appropriate paid Render plans and redeploy.

Record the backend HTTPS URL, for example `https://fpl-api.onrender.com`. Do not proceed to the frontend configuration until `GET <backend-url>/health` succeeds.

Render only prompts for new `sync: false` values during initial Blueprint creation. If these services already exist, add or update those variables manually in the Render dashboard. Apply the same shared values to both `fpl-api` and `fpl-worker` unless a variable is explicitly web-only.

## 2. Configure the staging backend for Telegram testing

Use these values for the first hosted Telegram Mini App test. Secret values belong in Render's dashboard and must never be committed.

| Variable | Staging value or source | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Keeps secure cookies and optimized Node behavior on Render. |
| `NODE_VERSION` | `22.22.0` | Pins the same supported LTS major used by backend CI and avoids unsupported current Node releases. |
| `APP_ENV` | `staging` | Allows the mock payment provider while retaining hosted-runtime checks. |
| `DATABASE_URL` | MongoDB Atlas SRV URL | Include the staging database name in the URL path. |
| `REDIS_URL` | Render key-value connection | Supplied by the Blueprint's service reference. |
| `SUPABASE_URL` | Supabase project URL | Backend only in this architecture. |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | Used by trusted backend code to perform user-scoped Auth operations. |
| `SUPABASE_SECRET_KEY` | Supabase secret key | Server-only; never place in Vercel or any `VITE_*` variable. |
| `CORS_ORIGIN` | Deployed Vercel frontend origin | HTTPS origin only, without a path. Add the admin origin as a comma-separated value if needed. |
| `FRONTEND_URL` | Deployed Vercel frontend origin | Used for auth and payment redirects. |
| `PUBLIC_API_URL` | Deployed Render backend URL | Set now so callback URLs are correct when payments are promoted later. |
| `TELEGRAM_AUTH_ENABLED` | `true` | Enables verified Mini App authentication. |
| `TELEGRAM_BOT_TOKEN` | Token from BotFather | Server-only. Never print it, commit it, log it, or expose it to frontend code. |
| `TELEGRAM_ALERTS_ENABLED` | `false` | Mini App authentication does not require bot alerts. |
| `TELEGRAM_WEBHOOK_SECRET` | Random secret | Required for the contact-sharing bot webhook when Telegram auth is enabled. |
| `TERMS_URL` | Public HTTPS Terms URL | Shown in the bot before users share their Telegram contact. |
| `PAYMENT_PROVIDER` | `mock` | Allowed only while `APP_ENV` is `local` or `staging`. |
| `PAYMENT_WEBHOOK_SECRET` | Random value, at least 32 characters | Still required in a hosted staging runtime. Do not use `dev-webhook-secret`. |
| `SUPPORT_CONTACT_EMAIL` | Real support address | The placeholder `support@example.com` is rejected in a hosted runtime. |
| `TELEBIRR_ENABLED` | `false` | No Telebirr merchant credentials are needed for staging Telegram testing. |
| `PORT` | Render-managed | Do not hardcode it in the dashboard. The backend default is `3000` for local use. |

Supabase Auth access and refresh tokens are stored in the existing HTTP-only cookies. There is no runtime `SESSION_SECRET`, `JWT_SECRET`, or `JWT_REFRESH_SECRET`. Older repository documentation or local files that mention the JWT names describe the retired pre-Supabase session implementation.

### Optional operational overrides

These are read by the backend but have safe schema defaults. Set them explicitly when production operations require different behavior:

- API and feature controls: `FPL_API_BASE_URL`, `ENABLE_INGESTION_CRON`, `ENABLE_SCORING_CRON`, `ENABLE_BULLMQ`, `ENABLE_SOCKET_IO`, `ADVANCED_MATCH_DATA_ENABLED`.
- Schedules: `INGESTION_CRON_BOOTSTRAP`, `INGESTION_CRON_STATS`, `SCORING_CRON_SCHEDULE`, `LIVE_STATS_POLL_CRON`, `PRICE_CHANGE_CRON`, `DEADLINE_REMINDER_CRON`, `DEADLINE_REMINDER_MINUTES`, `RECONCILIATION_CRON`, `FRAUD_DETECTION_CRON`.
- Cache: `CACHE_ENABLED`, `CACHE_TTL_PLAYERS_SECONDS`, `CACHE_TTL_FIXTURES_SECONDS`, `CACHE_TTL_STANDINGS_SECONDS`, `CACHE_TTL_STANDINGS_LIVE_SECONDS`, `CACHE_TTL_ANALYTICS_GROWTH_SECONDS`.
- Monitoring: `LOG_LEVEL`, `ALERT_QUEUE_FAILED_THRESHOLD`, `ALERT_ERROR_RATE_THRESHOLD`, `ALERT_ERROR_RATE_WINDOW_MINUTES`, `ALERT_COOLDOWN_SECONDS`.
- Finance limits: `FINANCE_CURRENCY`, `MAX_STAKE_MINOR`, `MAX_POT_MINOR`, `PLATFORM_COMMISSION_BPS`, `FINANCE_TERMS_VERSION`.

## 3. Deploy the frontend

Import `fpl-frontend` as a Vercel project and configure:

- Build command: `npm run build`
- Output directory: `dist`
- `VITE_API_BASE_URL=https://<deployed-render-backend>`
- `VITE_CURRENT_SEASON=<active-season>`, for example `2025/26`

`VITE_API_BASE_URL` is compiled into the browser bundle and must point to the deployed HTTPS backend, never `localhost`. Do not add database, Supabase secret, Telegram token, or other backend variables to Vercel.

If the first frontend deployment ran before `VITE_API_BASE_URL` was configured, trigger a new deployment. Updating a Vercel environment variable does not rewrite an already-built bundle.

After Vercel assigns the frontend URL, update `CORS_ORIGIN` and `FRONTEND_URL` on both Render services if the final origin differs from the provisional value, then redeploy the backend services.

## 4. Configure BotFather manually

These steps must be performed by hand in the Telegram app. Do not share the bot token while configuring the URLs.

1. Open `@BotFather` and send `/mybots`.
2. Select `@FantasyEtBot`.
3. Open **Bot Settings** → **Menu Button** → **Configure Menu Button**.
4. Set the URL to the deployed Vercel frontend HTTPS URL.
5. Set the button text, for example `Play Fantasy`.
6. Return to **Mini Apps** and confirm **Menu Button** no longer shows **Disabled**. If it remains disabled, open it and explicitly enable it.
7. Optional: open **Mini Apps** → **Main App**, configure the same HTTPS URL, select a short name, and explicitly enable it if it still shows **Disabled**. This produces a shareable URL such as `https://t.me/FantasyEtBot/<shortname>`.

The Login Widget, Games/Inline Mode, Commands, and the other bot-management modes shown in BotFather are unrelated to this Mini App authentication flow.

## 5. Staging smoke test

1. Open `@FantasyEtBot` in Telegram and tap the configured menu button.
2. If this Telegram account has not onboarded yet, open the bot chat, run `/start`, share the Telegram-owned contact, and choose **New user** or **I already have an account** when asked.
3. Confirm the Mini App shows only its brief connection state and does not show email/password login or registration UI.
4. For a new Telegram identity, confirm account creation succeeds and the app lands on Pick Team/Squad Selection with no existing team.
5. Close and reopen the Mini App. Confirm the same Telegram identity signs in without creating a duplicate account.
6. Complete Squad Selection and confirm Telegram's native **Confirm Squad** MainButton works.
7. Spot-check Pick Team and Transfers at a narrow Telegram WebView size, including safe-area padding and the native **Confirm Transfers** button.
8. Open the deployed Vercel URL directly in a normal browser and confirm unauthenticated users are directed to `@FantasyEtBot`, while already-authenticated sessions still hydrate normally.
9. Confirm browser requests and the live Socket.IO connection use the deployed Render URL rather than localhost.

## 6. Promote to real production

Do not promote payments until valid Telebirr merchant credentials and keys are available.

Change these Render variables on both services:

| Variable | Production requirement |
| --- | --- |
| `APP_ENV` | `production` |
| `PAYMENT_PROVIDER` | `telebirr` |
| `TELEBIRR_ENABLED` | `true` |
| `TELEBIRR_BASE_URL` | Production Telebirr gateway base URL |
| `TELEBIRR_FABRIC_APP_ID` | Merchant credential |
| `TELEBIRR_APP_SECRET` | Secret merchant credential |
| `TELEBIRR_MERCHANT_APP_ID` | Merchant credential |
| `TELEBIRR_MERCHANT_CODE` | Merchant credential |
| `TELEBIRR_PRIVATE_KEY` | Server-only signing private key; preserve newlines correctly |
| `TELEBIRR_PUBLIC_KEY` | Webhook verification public key |

Real production rejects `PAYMENT_PROVIDER=mock`. Enabling Telebirr without every listed merchant credential also fails environment validation. Redeploy the backend, verify `/health`, run Telebirr sandbox/production payment checks as appropriate, and repeat the Telegram and normal-browser smoke tests.

## Environment-example audit

The deployment-prep pass synchronized the examples with actual code usage:

- Backend runtime variables previously missing from `.env.example` were added: `NODE_ENV`, `APP_ENV`, `LOG_LEVEL`, `CACHE_TTL_STANDINGS_LIVE_SECONDS`, `CACHE_TTL_ANALYTICS_GROWTH_SECONDS`, `ALERT_QUEUE_FAILED_THRESHOLD`, `ALERT_ERROR_RATE_THRESHOLD`, `ALERT_ERROR_RATE_WINDOW_MINUTES`, and `ALERT_COOLDOWN_SECONDS`.
- Test-only variables were added separately: `TEST_DATABASE_URL` and `TEST_REDIS_URL`. The test database must be an isolated Atlas database named `fpl_test*` or `fpl_ci*`; integration tests refuse other database names.
- Maintenance-only variables were added separately: `SEED_DEV_ADMIN`, `MONGODB_DNS_SERVERS`, `BACKUP_VERIFIED`, `MIGRATION_VALIDATED`, and `CONFIRM_SCRUB`.
- `FRONTEND_URL` and `PUBLIC_API_URL` are now active example entries rather than commented hints.
- The frontend `.env.example` and `.env.production.example` already match code usage: `VITE_API_BASE_URL` and `VITE_CURRENT_SEASON`. `import.meta.env.DEV` is provided by Vite and is not a deploy-time variable.

## Deployment configuration inventory

- Present: `fpl-backend/render.yaml` for the backend web service, worker, and key-value service.
- Present: `fpl-frontend/vercel.json` for SPA routing and response headers.
- Present: `fpl-frontend/DEPLOY.md` for Vercel build settings.
- Not present and not required for the chosen targets: Dockerfile, Fly.io, Railway, Netlify, or other hosting configuration.
