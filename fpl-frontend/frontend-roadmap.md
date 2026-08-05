# Frontend Roadmap — FPL Clone

**Assumed stack:** React 18 + TypeScript, Vite, Tailwind CSS, Zustand (or Redux Toolkit), React Query (TanStack Query), React Router, Recharts, Socket.IO client.

> Swap any piece (Next.js, Vue, plain CSS) — the phases below stay the same regardless of framework.

---

## Phase 0 — Setup & Planning (Week 1)
- [ ] Init project with Vite + TypeScript template
- [ ] Configure Tailwind, ESLint, Prettier, absolute imports
- [ ] Set up routing skeleton (React Router)
- [ ] Set up global state store (auth, team, gameweek)
- [ ] Set up API client (Axios/fetch wrapper) pointing at backend
- [ ] Define TypeScript types/interfaces matching backend schema (Player, Team, Gameweek, League, Fixture)
- [ ] Decide design system: colors, typography, spacing scale (see skill.md)

## Phase 1 — Auth & Shell (Week 2)
- [ ] Login / Register / Forgot password pages
- [ ] JWT storage + refresh handling
- [ ] Protected route wrapper
- [ ] App shell: top nav, gameweek switcher, user menu
- [ ] Responsive layout skeleton (mobile-first, like real FPL)

## Phase 2 — Squad Builder (Weeks 3–4)
- [ ] Pitch view component (formation-based player layout, e.g. 4-4-2)
- [ ] Player list/search with filters (position, team, price, form)
- [ ] Budget tracker (£100m bank logic)
- [ ] Drag-and-drop or tap-to-select player swapping
- [ ] Formation validation (min/max per position, 15-man squad rule)
- [ ] Captain/vice-captain selection UI
- [ ] Save squad → call backend endpoint

## Phase 3 — Gameweek & Points Display (Week 5)
- [ ] "My Team" view showing live/confirmed points per player
- [ ] Points breakdown modal (goals, assists, clean sheet, bonus, cards)
- [ ] Gameweek deadline countdown component
- [ ] Auto-substitution display (bench players swapped in on blanks)
- [ ] Historical gameweek navigation

## Phase 4 — Transfers (Week 6)
- [ ] Transfer market view (same as squad builder but tracks changes)
- [ ] Free transfers counter + points-hit calculation (-4 per extra transfer)
- [ ] Transfer confirmation screen with diff summary
- [ ] Transfer history page

## Phase 5 — Chips (Week 7)
- [ ] Chip selector UI: Wildcard, Free Hit, Bench Boost, Triple Captain
- [ ] Chip-active state banners across relevant screens
- [ ] Chip usage history/tracker
- [ ] Disable used chips for the season (or per your rules)

## Phase 6 — Leagues (Weeks 8–9)
- [ ] Create league (classic/head-to-head) form
- [ ] Join league via code
- [ ] League standings table (sortable, paginated)
- [ ] League detail page with gameweek-by-gameweek movement
- [ ] Head-to-head fixture view (if supporting H2H leagues)

## Phase 7 — Stats, Fixtures & Player Profiles (Week 10)
- [ ] Fixtures/results calendar with difficulty ratings (FDR)
- [ ] Player profile page: form, price history, ownership %, upcoming fixtures
- [ ] Dream Team / top performers page
- [ ] Global filters/search across players

## Phase 8 — Live Updates (Week 11)
- [x] WebSocket connection for live gameweek score updates
- [x] Live bonus point provisional display
- [x] Toast/notification system for price changes, deadlines

## Phase 9 — Polish & Performance (Week 12)
- [x] Code-splitting/lazy loading routes
- [x] Skeleton loaders & optimistic UI for transfers
- [x] Accessibility pass (keyboard nav, ARIA labels, contrast)
- [x] Full responsive QA (mobile/tablet/desktop)
- [x] Error boundaries + offline/slow-network handling
- [x] Lighthouse audit (aim 90+ perf/accessibility)

## Phase 10 — Deployment
- [ ] Env-based config (dev/staging/prod API URLs)
- [ ] CI pipeline (lint, type-check, build, test)
- [ ] Deploy to Vercel/Netlify/CloudFront+S3
- [ ] Set up error tracking (Sentry) and analytics

---

## Suggested build order priority
If time-constrained, build in this order for a usable MVP fastest:
**Auth → Squad Builder → My Team/Points → Transfers → Leagues → Chips → Live updates → Polish**
