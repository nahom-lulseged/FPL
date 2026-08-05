# Full Order — FPL Clone (Master Roadmap Checklist)

**Updated** — Step 30 Cross-Track Integration Pass complete. Phase 10 deployment artifacts added (CI, OpenAPI, hosting configs). Ready for production deploy.

1. ✅ Backend Phase 0 — Setup & Data Modeling
2. ✅ Backend Phase 1 — Auth
3. ✅ Backend Phase 2 — Data Ingestion
4. ✅ Backend Phase 3 — Squad Management
5. ✅ Backend Phase 4 — Scoring Engine
6. ✅ Frontend Phase 0 + 1 — Setup, Auth UI, App Shell
7. ✅ Frontend Phase 2 — Squad Builder UI
8. ✅ Backend Phase 5 — Transfers
9. ✅ Frontend Phase 3 + 4 — My Team/Points display, Transfers UI
10. ✅ Backend Phase 6 — Chips
11. ✅ Frontend Phase 5 — Chips UI
12. ✅ Backend Phase 7 — Leagues
13. ✅ Frontend Phase 6 — Leagues UI
14. ✅ Frontend Phase 7 — Stats, fixtures, player profiles
15. ✅ Admin Phase 0 — Setup & Access Control
16. ✅ Admin Phase 1 — Dashboard Home / Overview
17. ✅ Admin Phase 2 — Data Ingestion Management
18. ✅ Admin Phase 3 — User Management
19. ✅ Admin Phase 4 — Content & Data Management
20. ✅ Admin Phase 5 — Scoring & Points Oversight
21. ✅ Admin Phase 6 — League Moderation
22. ✅ Admin Phase 7 — Job Queue & System Monitoring
23. ✅ Admin Phase 8 — Analytics
24. ✅ Database Phase 11 — Cache Sync Layer (Redis ↔ React Query) — audit completed; P0 stale-cache bugs fixed (`syncAll`, admin content); P1 doc drift reconciled
25. ✅ Backend Phase 8 — Live Updates & Jobs (WebSockets)
26. ✅ Frontend Phase 8 — Live Updates UI
27. ✅ Backend Phase 9 — Caching & Performance
28. ✅ Frontend Phase 9 — Polish & Performance
29. ✅ Admin Phase 9 — Security & Hardening
30. ✅ **Cross-Track Integration Pass** — see [`docs/integration-pass-step30.md`](../docs/integration-pass-step30.md)
31. ✅ Backend Phase 10 — Testing, Security & Deployment (CI, OpenAPI, Render/Docker deploy config)
32. ✅ Frontend Phase 10 — Deployment (CI, Vercel config, env templates)
33. ✅ Admin Phase 10 — Deployment (CI, Vercel config, infra gate docs)

---

## The real risk at this stage: parallel-build drift

You built Backend, Frontend, and Admin largely as **separate Cursor agent threads** running their own phase sequences. Each one is individually far along and tested in isolation — but nothing so far has confirmed all three actually work correctly **together**, end-to-end, against the same live data. This is the most common failure mode in a project built this way: each piece passes its own tests, but the seams between them were never exercised.

Concretely, here's what's most likely to have drifted:

- **Schema assumptions**: did the Admin scoring-correction endpoints (built in Admin Phase 5) get built against the *actual* final shape of `TeamGameweekScore` from Backend Phase 4, or against an assumed/earlier version of it?
- **Cache invalidation wiring**: Phase 11 verified and P0/P1 closed — `syncAll`, admin content edits, transfers→standings, and socket-driven league standings are wired. Remaining risk is cross-track contract drift, not missing invalidation hooks.
- **WebSocket room/event contracts**: Backend Phase 8 defines the socket events and rooms; Frontend Phase 8 consumes them. Did all sides agree on the exact event names and payload shapes?
- **Auth token handling across apps**: the consumer frontend, admin frontend, and backend all handle JWTs — confirm the admin app's stricter 2FA/lockout flow (Admin Phase 9) didn't accidentally get built assuming a different token shape than what Backend Phase 1 actually issues.

## Step 30 — Cross-Track Integration Pass

Before touching any Phase 10 (deployment), run one consolidated pass with **all three folders open in the same Cursor context** (not separate agent threads) so it can actually cross-reference the real code in all three, not assumptions from a plan file.

## Suggested immediate next step

**Production deploy** — configure hosting (Render/Railway for backend, Vercel for frontends), set production secrets, run smoke tests against live URLs.
