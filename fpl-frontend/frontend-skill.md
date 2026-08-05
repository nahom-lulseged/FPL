# Frontend Skill Map — FPL Clone

Skills grouped by how soon you'll need them, mapped to the roadmap phases.

## Core (needed from day 1)
- **React fundamentals**: components, props, state, hooks (useState, useEffect, useMemo, useCallback)
- **TypeScript**: interfaces, generics, union types, typing API responses
- **Tailwind CSS**: utility classes, responsive breakpoints, custom theme config
- **React Router**: nested routes, protected routes, route params
- **Fetch/Axios**: interceptors, error handling, auth headers

## State Management (Phase 0–2)
- **Zustand or Redux Toolkit**: global state for auth, current team, active gameweek
- **React Query (TanStack Query)**: server-state caching, background refetch, mutations for transfers/team saves
- Understanding **client vs server state** separation (critical for a data-heavy app like this)

## Squad Builder UI (Phase 2)
- **Drag-and-drop**: `dnd-kit` or `react-beautiful-dnd` alternatives
- **Complex form/validation logic**: budget constraints, position limits, squad rules
- **CSS Grid/Flexbox**: building a football pitch layout that's responsive
- **SVG basics**: pitch background, jersey icons

## Data Visualization (Phase 7)
- **Recharts or Chart.js**: price history graphs, points-over-time charts, ownership trends
- **Data tables**: sorting, filtering, pagination (TanStack Table is a good fit)

## Real-time (Phase 8)
- **WebSockets (Socket.IO client)**: subscribing to live gameweek events
- **Optimistic UI updates**: showing pending state before server confirms

## Performance & Quality (Phase 9)
- **Code-splitting**: `React.lazy` + `Suspense`
- **Memoization patterns**: avoiding unnecessary re-renders in large player lists
- **Testing**: React Testing Library (component tests), Playwright/Cypress (E2E for the transfer flow)
- **Accessibility**: semantic HTML, ARIA roles, focus management in modals

## Nice-to-have / stretch
- **PWA basics**: offline caching of fixture/player data
- **Framer Motion**: transitions for chip activation, transfer confirmations
- **i18n**: if supporting multiple languages later

## Design skills (not code, but needed)
- Reading and replicating a **design system** (spacing scale, color tokens, typography)
- Building a **component library** mindset (Button, Card, Modal, Badge reused everywhere)
- Mobile-first responsive design thinking — FPL is used heavily on phones

## Recommended learning order
1. React + TypeScript + Tailwind basics → build static pages
2. React Router + protected routes → auth flow works end-to-end
3. React Query + Zustand → connect to real backend data
4. Drag-and-drop + form validation → squad builder
5. Charts + tables → stats pages
6. WebSockets → live scoring
7. Testing + performance → hardening before launch
