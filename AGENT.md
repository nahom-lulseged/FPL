# AGENT.md

## Project Overview
Build a Fantasy Premier League-style web app using Next.js, React, TypeScript, Node.js backend logic, and Supabase. The app should support user authentication, squad building, transfers, leagues, live scoring, and gameweek-based management.

The system should feel fast, reliable, mobile-friendly, and production-ready. Prefer simple, maintainable solutions over clever abstractions.

## Tech Stack
- Frontend: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS or equivalent component library
- Backend: Node.js using Next.js Route Handlers for API endpoints and server logic
- Database: Supabase Postgres
- Auth: Supabase Auth
- Realtime: Supabase Realtime
- Storage: Supabase Storage if needed
- Validation: Zod
- ORM: Optional; use raw SQL or Supabase client where appropriate
- Testing: Vitest or Jest + Playwright for UI flows

## Core Product Rules
- Users create and manage a 15-player squad under a fixed budget.
- Enforce formation rules, club limits, transfer rules, and deadlines.
- Support captain, vice-captain, bench order, and starting XI.
- Support chips: Wildcard, Free Hit, Bench Boost, Triple Captain.
- Track points by gameweek and update standings live.
- Support private leagues and head-to-head leagues.
- Keep all rules configurable where possible.

## Data Model
Use normalized relational tables in Supabase Postgres.
Main entities:
- users
- clubs
- players
- fixtures
- gameweeks
- squads
- squad_picks
- transfers
- points_events
- leagues
- league_members
- chip_usages
- price_history

Use foreign keys for all important relationships.

## Security Rules
- Enable Row Level Security on all user-facing tables.
- Users may only read or modify their own squads, transfers, and private league records.
- Use Supabase Auth user IDs to link app users to database rows.
- Use service-role access only in trusted server code or admin jobs.
- Never expose service keys to the client.

## Backend Rules
- Use Node.js server logic in Next.js Route Handlers under `app/api/.../route.ts`.
- Put business logic in `server/` or `features/` modules, not inside React components.
- Use Route Handlers for writes that need validation, secure API access, or admin sync.
- Keep external API calls on the server only.
- Use Zod to validate all request payloads before touching the database.

## Realtime Rules
- Use Supabase Realtime for live score updates, league rank changes, and transfer alerts.
- Keep subscriptions narrow and scoped to the authenticated user or league.
- Avoid unnecessary realtime listeners on large tables.
- Realtime updates must not bypass authorization rules.

## Architecture Rules
- Keep UI, data access, and business logic separate.
- Prefer server actions or Route Handlers for writes.
- Use database views or RPCs for complex queries like squad status and standings.
- Keep components small, reusable, and easy to test.

```

## Development Priorities
1. Set up Supabase project, auth, and database schema.
2. Build player browsing and squad builder.
3. Implement scoring and gameweek logic.
4. Add transfers, chips, and deadlines.
5. Add leagues and realtime updates.
6. Add tests, analytics, and deployment readiness.

## Implementation Guidelines
- Use TypeScript strictly.
- Validate all input with Zod.
- Handle loading, empty, and error states explicitly.
- Write SQL migrations carefully and review foreign keys and indexes.
- Use optimistic UI only when rollback behavior is safe.
- Log key domain events: squad changes, transfers, chip usage, and score syncs.

## Database Guidelines
- Index all foreign keys and common filter columns.
- Keep player stats, fixtures, and gameweek data normalized.
- Store raw external API payloads separately if needed.
- Use views for read-heavy screens like standings and squad summaries.
- Use timestamps consistently in UTC.

## Testing Guidelines
- Unit test squad validation, transfer rules, and scoring logic.
- Integration test database access and RLS behavior.
- End-to-end test key flows:
  - sign up / sign in
  - build squad
  - make transfer
  - join league
  - view live points

## Output Expectations
When generating code, prefer:
- Clear file structure.
- Small, focused components.
- Reusable business logic.
- Secure Supabase queries.
- Minimal but complete documentation.

## Non-Goals
- Do not over-engineer microservices.
- Do not add unnecessary state management.
- Do not duplicate logic between client and server.
- Do not build features that are not needed for a working fantasy football MVP.

## Definition of Done
The project is complete when users can:
- Sign up and log in.
- Build and edit a fantasy squad.
- Make valid transfers.
- See points and standings update.
- Join and view leagues.
- Use the app securely with RLS-protected data.
