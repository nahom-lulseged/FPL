# Admin Dashboard Folder Structure — FPL Clone

Two parts: the **admin-frontend** app (separate from the consumer frontend) and the **admin module additions** inside the existing `fpl-backend/` from `backend-folder-structure.md`.

---

## Part 1 — `admin-frontend/` (new, separate app)

```
admin-frontend/
├── public/
│   └── favicon.ico
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   │
│   ├── api/
│   │   ├── client.ts                    # axios instance, sends admin JWT
│   │   ├── auth.api.ts
│   │   ├── users.api.ts
│   │   ├── ingestion.api.ts
│   │   ├── players.api.ts
│   │   ├── fixtures.api.ts
│   │   ├── gameweeks.api.ts
│   │   ├── scoring.api.ts
│   │   ├── leagues.api.ts
│   │   ├── jobs.api.ts
│   │   └── audit.api.ts
│   │
│   ├── types/
│   │   ├── user.ts
│   │   ├── auditLog.ts
│   │   ├── ingestionStatus.ts
│   │   └── jobStatus.ts
│   │
│   ├── store/
│   │   ├── adminAuthStore.ts
│   │   └── uiStore.ts
│   │
│   ├── hooks/
│   │   ├── useUsers.ts
│   │   ├── useIngestionStatus.ts
│   │   ├── usePlayersAdmin.ts
│   │   ├── useLeaguesAdmin.ts
│   │   ├── useJobQueue.ts
│   │   └── useAuditLog.ts
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   └── AdminLoginPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardHomePage.tsx
│   │   ├── ingestion/
│   │   │   ├── IngestionControlPage.tsx
│   │   │   └── SyncHistoryPage.tsx
│   │   ├── users/
│   │   │   ├── UsersListPage.tsx
│   │   │   └── UserDetailPage.tsx
│   │   ├── content/
│   │   │   ├── PlayersManagePage.tsx
│   │   │   ├── RealTeamsManagePage.tsx
│   │   │   ├── FixturesManagePage.tsx
│   │   │   └── GameweeksManagePage.tsx
│   │   ├── scoring/
│   │   │   ├── PointsCorrectionPage.tsx
│   │   │   └── RecalculationHistoryPage.tsx
│   │   ├── leagues/
│   │   │   ├── LeaguesListPage.tsx
│   │   │   └── LeagueDetailPage.tsx
│   │   ├── system/
│   │   │   ├── JobQueuePage.tsx           # or embeds bull-board via iframe/link
│   │   │   └── AuditLogPage.tsx
│   │   └── analytics/
│   │       └── AnalyticsPage.tsx
│   │
│   ├── components/
│   │   ├── common/                        # Button, Modal, Badge, Table, ConfirmDialog
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── ProtectedAdminRoute.tsx
│   │   ├── tables/
│   │   │   ├── DataTable.tsx               # generic sortable/filterable table
│   │   │   └── CsvExportButton.tsx
│   │   ├── forms/
│   │   │   └── GenericCrudForm.tsx         # reusable create/edit form
│   │   ├── diff/
│   │   │   └── JsonDiffViewer.tsx          # before/after viewer for corrections
│   │   ├── metrics/
│   │   │   ├── KpiCard.tsx
│   │   │   └── SparklineChart.tsx
│   │   └── audit/
│   │       └── AuditLogTable.tsx
│   │
│   ├── lib/
│   │   ├── formatters.ts
│   │   └── csvExport.ts
│   │
│   └── styles/
│       └── globals.css                     # utilitarian variant of main theme
│
├── .env.example
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## Part 2 — Additions to `fpl-backend/` (extends `backend-folder-structure.md`)

```
fpl-backend/
├── src/
│   ├── modules/
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   │   ├── adminUsers.controller.ts   # list/search/suspend/promote/delete
│   │   │   │   ├── adminUsers.service.ts
│   │   │   │   └── adminUsers.routes.ts
│   │   │   ├── scoring/
│   │   │   │   ├── adminScoring.controller.ts # manual correction, recalculation trigger
│   │   │   │   ├── adminScoring.service.ts
│   │   │   │   └── adminScoring.routes.ts
│   │   │   ├── leagues/
│   │   │   │   ├── adminLeagues.controller.ts # moderate/remove member/dissolve
│   │   │   │   ├── adminLeagues.service.ts
│   │   │   │   └── adminLeagues.routes.ts
│   │   │   ├── content/
│   │   │   │   ├── adminContent.controller.ts # manual player/fixture/gameweek overrides
│   │   │   │   ├── adminContent.service.ts
│   │   │   │   └── adminContent.routes.ts
│   │   │   ├── analytics/
│   │   │   │   ├── adminAnalytics.controller.ts
│   │   │   │   └── adminAnalytics.service.ts
│   │   │   └── audit/
│   │   │       ├── auditLog.service.ts        # wraps mutating actions, writes AuditLog rows
│   │   │       ├── auditLog.controller.ts
│   │   │       └── auditLog.routes.ts
│   │   │
│   │   └── ingestion/                          # already exists — admin routes added here:
│   │       └── ingestion.routes.ts              # already has /api/admin/ingestion/*
│   │
│   ├── middleware/
│   │   ├── adminGuard.ts                        # extends authGuard, checks isAdmin === true
│   │   ├── auditLogger.ts                        # middleware/wrapper to auto-log mutating admin routes
│   │   └── adminRateLimiter.ts                   # stricter limits on /api/admin/auth/*
│   │
│   └── jobs/
│       └── bullBoard.ts                          # mounts bull-board UI at /admin/queues
│
├── prisma/
│   └── schema.prisma                             # add AdminAuditLog model:
│                                                   #   id, adminId, action, targetType,
│                                                   #   targetId, beforeJson, afterJson, createdAt
```

**Notes**
- All admin routes live under `/api/admin/*` on the **same backend** — no separate admin API server needed. `adminGuard` middleware enforces `isAdmin === true` on every route in this namespace.
- `auditLog.service.ts` should be called from inside every admin service method that mutates data (ban user, correct points, dissolve league) — treat it as mandatory, not optional, for anything destructive or points-affecting.
- `bull-board` mounted at `/admin/queues` (protected by the same `adminGuard`) saves you from building a custom job-monitoring UI in Phase 7 of the roadmap.
- Keep `admin-frontend/` as a fully separate deployable app — it should not be bundled into the consumer app's build output, and should NOT go through the same public CI deploy path.
