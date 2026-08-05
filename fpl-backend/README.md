# FPL Backend

Express API using MongoDB Atlas for application data, Supabase Auth for credentials/sessions/MFA, and hosted Redis-compatible Key Value for BullMQ and ephemeral state.

## Required services

- MongoDB Atlas replica set; production uses the `fpl` database.
- Supabase project `bdxgtxevzffcvlcdfcmg` with email confirmation, custom SMTP, recovery redirects, and TOTP enabled.
- Hosted Key Value with persistence and `noeviction`.
- Native Node web and worker services configured by `render.yaml`.

Copy `.env.example` to `.env` and supply hosted credentials. Local MongoDB, local Redis, memory servers, and Docker are intentionally unsupported.

```sh
npm ci
npx prisma generate
npm run build
npm start
```

Run the worker separately with `npm run start:worker`. Integration tests require allowlisted `TEST_DATABASE_URL` (`fpl_ci*` or `fpl_test*` on Atlas) and remote `TEST_REDIS_URL`.

## Telegram Mini App

Set `TELEGRAM_AUTH_ENABLED=true` and provide `TELEGRAM_BOT_TOKEN` from the BotFather profile for `@FantasyEtBot`. Also set `TELEGRAM_WEBHOOK_SECRET` and `TERMS_URL`; `/start` shows the Terms URL before asking users to share their Telegram-owned contact. The token is server-only: never place it in a `VITE_*` variable, client bundle, logs, or git history.

The Mini App must be deployed at a public HTTPS URL. In BotFather:

1. Run `/mybots`, select the bot, then choose **Bot Settings -> Menu Button** and set the Web App URL to the deployed frontend HTTPS URL.
2. Optionally register the same URL under **Mini Apps** to create a shareable `t.me/<bot>/<shortname>` link.
3. Confirm that `TELEGRAM_BOT_TOKEN` exactly matches the token shown in the bot profile.

After deployment, run `npm run telegram:set-webhook` from `fpl-backend` with `PUBLIC_API_URL`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_WEBHOOK_SECRET` configured. Consumer email/password auth is retired; direct browser users are guided to `https://t.me/FantasyEtBot`, while admin email/password plus TOTP remains separate.

## Cutover

Take and verify an encrypted dump before maintenance. Restore ObjectIds unchanged to an empty Atlas destination, validate collection counts and references, then run `npm run migrate:auth -- --dry-run`. Set `BACKUP_VERIFIED=true` and rerun without `--dry-run` only after reviewing output. Do not scrub legacy credential fields until migrated users, admin AAL2, Telegram login, queues, and rollback have all been validated.
