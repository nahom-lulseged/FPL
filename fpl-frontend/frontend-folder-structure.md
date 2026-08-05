# Frontend Folder Structure — FPL Clone

```
fpl-frontend/
├── public/
│   ├── favicon.ico
│   └── shirts/                     # jersey/kit images per team
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx                  # route definitions
│   │
│   ├── api/                        # API layer
│   │   ├── client.ts                # axios instance, interceptors
│   │   ├── auth.api.ts
│   │   ├── players.api.ts
│   │   ├── teams.api.ts
│   │   ├── leagues.api.ts
│   │   ├── fixtures.api.ts
│   │   └── transfers.api.ts
│   │
│   ├── types/                      # shared TS types/interfaces
│   │   ├── player.ts
│   │   ├── team.ts
│   │   ├── gameweek.ts
│   │   ├── league.ts
│   │   ├── fixture.ts
│   │   └── user.ts
│   │
│   ├── store/                      # Zustand/Redux slices
│   │   ├── authStore.ts
│   │   ├── squadStore.ts
│   │   ├── gameweekStore.ts
│   │   └── uiStore.ts               # modals, toasts, loading flags
│   │
│   ├── hooks/                      # custom hooks (mostly React Query wrappers)
│   │   ├── usePlayers.ts
│   │   ├── useMyTeam.ts
│   │   ├── useFixtures.ts
│   │   ├── useLeagues.ts
│   │   └── useLiveScores.ts         # websocket hook
│   │
│   ├── pages/                      # route-level pages
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── team/
│   │   │   ├── MyTeamPage.tsx
│   │   │   ├── SquadBuilderPage.tsx
│   │   │   └── TransfersPage.tsx
│   │   ├── leagues/
│   │   │   ├── LeaguesListPage.tsx
│   │   │   ├── LeagueDetailPage.tsx
│   │   │   └── CreateLeaguePage.tsx
│   │   ├── stats/
│   │   │   ├── PlayerStatsPage.tsx
│   │   │   ├── FixturesPage.tsx
│   │   │   └── DreamTeamPage.tsx
│   │   └── PlayerProfilePage.tsx
│   │
│   ├── components/
│   │   ├── common/                  # generic reusable UI
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── GameweekSwitcher.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pitch/                   # squad builder specific
│   │   │   ├── PitchView.tsx
│   │   │   ├── PlayerCard.tsx
│   │   │   ├── FormationSelector.tsx
│   │   │   ├── BudgetTracker.tsx
│   │   │   └── CaptainSelector.tsx
│   │   ├── transfers/
│   │   │   ├── TransferList.tsx
│   │   │   ├── TransferSummary.tsx
│   │   │   └── PointsHitWarning.tsx
│   │   ├── chips/
│   │   │   └── ChipSelector.tsx
│   │   ├── league/
│   │   │   ├── StandingsTable.tsx
│   │   │   └── H2HFixtureCard.tsx
│   │   └── charts/
│   │       ├── PriceHistoryChart.tsx
│   │       └── PointsOverTimeChart.tsx
│   │
│   ├── lib/                        # helpers/utilities
│   │   ├── formatters.ts            # currency, dates
│   │   ├── fplRules.ts              # squad validation rules, scoring constants
│   │   └── socket.ts                # websocket client setup
│   │
│   ├── styles/
│   │   └── globals.css              # Tailwind base + custom tokens
│   │
│   └── tests/
│       ├── unit/
│       └── e2e/
│
├── .env.example
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

**Notes**
- `pages/` stay thin — they compose components and call hooks, no business logic.
- `lib/fplRules.ts` centralizes scoring/squad-rule constants so frontend validation always matches backend rules.
- Keep `components/` organized by feature domain (pitch, transfers, chips, league) rather than one flat folder — it scales much better once the app grows.
