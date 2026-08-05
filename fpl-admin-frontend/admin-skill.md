# Admin Dashboard Skill Map — FPL Clone

Most of this overlaps with the main frontend/backend skills you've already built — this file focuses on what's *specific* to admin tooling.

## Core (shared with main frontend)
- React + TypeScript + Tailwind (same as consumer app)
- React Query for server state, forms for CRUD operations
- React Router with role-protected routes

## Admin-Specific Frontend Skills
- **Data-dense table UI**: building sortable/filterable/paginated tables that stay fast with hundreds/thousands of rows (TanStack Table is a strong fit again here)
- **CRUD form patterns**: generic create/edit form components you can reuse across Users, Players, Fixtures, Leagues rather than hand-building each one
- **Diff/audit viewers**: rendering before/after JSON diffs in a readable way (useful for the points-correction and audit-log features)
- **Dashboard/metrics UI**: card-based KPI layouts, simple sparkline charts (Recharts again works fine)
- **Confirmation/destructive-action UX**: modals with type-to-confirm patterns for irreversible actions (ban user, dissolve league, delete account)
- **CSV export**: client-side (e.g. `papaparse` unparse) or server-generated download links

## Backend-Specific Skills for Admin Routes
- **Role-based access control (RBAC)**: beyond a simple `isAdmin` boolean, consider designing for future roles (super-admin, moderator, support) even if you only implement one role now — makes it easier to extend later
- **Audit logging design**: an `AdminAuditLog` table/service that wraps every mutating admin action — this is a distinct skill from normal CRUD because you're logging *intent and actor*, not just data changes
- **Idempotent admin operations**: manual re-sync and recalculation endpoints must be safe to run multiple times without corrupting data (same upsert discipline as ingestion)
- **Job queue introspection**: reading BullMQ queue state, exposing failed job details, and building manual retry endpoints
- **Soft-delete vs hard-delete patterns**: deciding when banning/suspending (soft) is appropriate vs full account deletion (hard, GDPR-driven)

## Security Skills (higher bar than the consumer app)
- **Infrastructure-level access restriction**: configuring Cloudflare Access, a VPN gateway, or basic-auth in front of the admin app in addition to normal login
- **2FA implementation**: TOTP (e.g. `otplib`) for admin accounts specifically
- **Stricter rate limiting and lockout policies** on admin auth endpoints
- **Principle of least privilege**: making sure admin API tokens/sessions can't be reused against consumer endpoints in unintended ways, and vice versa

## Operational/Monitoring Skills
- **Log aggregation basics**: querying structured logs (pino output) by request ID, user ID, or error type
- **Alerting**: wiring a failed-job or failed-sync event to Slack/email (webhook basics)
- **Reading APM/monitoring dashboards** if you add one (even a lightweight one like Better Stack or Uptime Kuma)

## Nice-to-have
- **`bull-board`**: drop-in BullMQ dashboard — worth using instead of building custom job-queue UI from scratch, saves significant time
- **Feature flag basics**: if you want to admin-toggle features (e.g. disable transfers during a "double gameweek" freeze) without a deploy

## Recommended learning order
1. Reuse existing frontend/backend skills → scaffold the admin app fast (it shares almost everything with the main app)
2. RBAC + server-side admin guard → lock down every admin route first, before building features
3. Data-dense tables + CRUD forms → user/player/fixture management screens
4. Audit logging → wrap it around every mutating action as you build each feature, not as an afterthought
5. Job queue tooling (`bull-board`) → ingestion and scoring oversight
6. Security hardening (2FA, IP allowlist, stricter rate limits) → before this ever touches production with real user data
