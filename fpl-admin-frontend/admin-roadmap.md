# Admin Dashboard Roadmap — FPL Clone

**Assumed stack:** Same as main frontend (React + TypeScript + Vite + Tailwind + React Query), but as a **separate app** (`admin-frontend/`) sharing the same backend API under `/api/admin/*` routes, protected by the `isAdmin` flag already added in Backend Phase 2.

> Building the admin panel as a separate app (not a hidden route inside the main FPL frontend) keeps bundle size down for regular users and lets you lock deployment/access down independently (different subdomain, IP allowlist, SSO, etc.).

---

## Phase 0 — Setup & Access Control (Week 1)
- [ ] Scaffold `admin-frontend/` as its own Vite + React + TS project
- [ ] Reuse the design system/tokens from `ui-design-color-roadmap.md` but with a more utilitarian, data-dense layout (less "consumer app," more "control panel")
- [ ] Admin login page — hits the same `/api/auth/login` endpoint, but the app checks `isAdmin` on the returned user and rejects non-admins client-side (backend must also enforce this server-side on every admin route — never trust the client check alone)
- [ ] Protected route wrapper requiring `isAdmin === true`
- [ ] Basic shell: sidebar nav + top bar with admin identity/logout

## Phase 1 — Dashboard Home / Overview (Week 2)
- [ ] System health widget: DB connection status, Redis status, last ingestion sync time/result (from `GET /api/admin/ingestion/status`)
- [ ] Key metrics cards: total users, total teams created, active leagues, current gameweek + deadline countdown
- [ ] Recent activity feed (new registrations, recent transfers volume, errors from job queue)
- [ ] Quick-action buttons: trigger manual data sync, view job queue, jump to user search

## Phase 2 — Data Ingestion Management (Week 3)
- [ ] Ingestion control panel: manually trigger `syncAll()`, or individual syncs (teams/players/fixtures/gameweeks)
- [ ] Sync history table: timestamp, duration, rows changed, success/failure, error log viewer
- [ ] Scheduled job status view (BullMQ dashboard integration — consider embedding `bull-board` here directly instead of building custom UI)
- [ ] Manual player data override form (fix a bad price/status if the source API is wrong or delayed)

## Phase 3 — User Management (Week 4)
- [ ] User list with search/filter (email, registration date, team count, admin status)
- [ ] User detail view: profile info, their team(s), transfer history, league memberships
- [ ] Actions: suspend/ban user, reset password (send reset link), promote/demote admin, delete account (GDPR-style hard delete with confirmation)
- [ ] Audit log of admin actions taken on users (who did what, when — critical for accountability)

## Phase 4 — Content & Data Management (Week 5)
- [ ] Player management: view/edit player metadata not covered by ingestion (e.g. injury news blurb, manual status override)
- [ ] Real team management: crest/logo uploads, short-name overrides
- [ ] Fixture management: manually adjust postponed/rescheduled fixtures, override kickoff times
- [ ] Gameweek management: manually open/close/finalize a gameweek, adjust deadline in emergencies

## Phase 5 — Scoring & Points Oversight (Week 6)
- [ ] Manual points correction tool (rare but necessary — e.g. official FPL sometimes retroactively changes bonus points)
- [ ] Points recalculation trigger for a given gameweek (re-runs the scoring engine)
- [ ] Diff viewer: shows what changed before/after a recalculation, per affected team
- [ ] Auto-substitution audit log (see which teams had auto-subs applied and why)

## Phase 6 — League Moderation (Week 7)
- [ ] League list with search (by name, creator, member count)
- [ ] League detail view: standings, members, ability to remove a member or dissolve a league (for abuse/spam leagues)
- [ ] Flagging/reporting queue if you allow users to report leagues or usernames

## Phase 7 — Job Queue & System Monitoring (Week 8)
- [ ] Embed or link to `bull-board` for BullMQ job visibility (failed jobs, retries, queue depth)
- [ ] Error log viewer (pull from your logging service — Sentry/pino logs)
- [ ] Basic uptime/latency dashboard if you're not already using an external APM tool
- [ ] Alert configuration (email/Slack webhook when ingestion fails or a job queue backs up)

## Phase 8 — Analytics (Week 9, optional but valuable)
- [ ] Most-transferred-in/out players this gameweek (useful for admin insight, could later surface to users too)
- [ ] Chip usage distribution across all users
- [ ] Growth chart: registrations over time, active teams over time
- [ ] Export to CSV for any table view (users, leagues, players)

## Phase 9 — Security & Hardening (Week 10)
- [ ] Enforce `isAdmin` check server-side on every single admin route (never rely on frontend gating)
- [ ] Add IP allowlist or VPN requirement for admin panel access in production
- [ ] Add 2FA for admin accounts specifically (even if not required for regular users)
- [ ] Rate limit admin login attempts more aggressively than regular users
- [ ] Full audit logging: every mutating admin action logged with adminId, timestamp, before/after values

## Phase 10 — Deployment
- [ ] Deploy `admin-frontend/` to a separate subdomain (e.g. `admin.yourfplclone.com`)
- [ ] Restrict via infrastructure-level access control (Cloudflare Access, VPN, or basic auth in front of the app) in addition to app-level auth
- [ ] Separate CI pipeline so admin deploys don't couple to consumer app releases

---

## Suggested build order priority
**Access control → Ingestion management → User management → Scoring oversight → League moderation → Job monitoring → Analytics → Hardening**

Ingestion and scoring oversight are the highest-value early wins — they're the tools you'll personally rely on constantly during a live gameweek to fix data issues before users notice.
