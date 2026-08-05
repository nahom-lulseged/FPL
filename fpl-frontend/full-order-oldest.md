# Full Order — FPL Clone (Master Roadmap Checklist)

Marked ✅ based on what's been confirmed completed in our conversation so far. Update these yourself as you go — I can't see your actual repo/test runs, only what you've reported.

1. ✅ Backend Phase 0 — Setup & Data Modeling
2. ✅ Backend Phase 1 — Auth
3. ✅ Backend Phase 2 — Data Ingestion
4. ⬜ Backend Phase 3 — Squad Management
5. ⬜ Backend Phase 4 — Scoring Engine *(highest complexity — budget extra review time)*
6. ⬜ Frontend Phase 0 + 1 — Setup, Auth UI, App Shell
7. ⬜ Frontend Phase 2 — Squad Builder UI
8. ⬜ Backend Phase 5 — Transfers
9. ⬜ Frontend Phase 3 + 4 — My Team/Points display, Transfers UI
10. ⬜ Backend Phase 6 — Chips
11. ⬜ Frontend Phase 5 — Chips UI
12. ⬜ Backend Phase 7 — Leagues
13. ⬜ Frontend Phase 6 — Leagues UI
14. ⬜ Frontend Phase 7 — Stats, fixtures, player profiles
15. ✅ Admin Phase 0 — Setup & Access Control
16. ✅ Admin Phase 1 — Dashboard Home / Overview
17. ✅ Admin Phase 2 — Data Ingestion Management
18. ✅ Admin Phase 3 — User Management
19. ✅ Admin Phase 4 — Content & Data Management
20. ⬜ Admin Phase 5 — Scoring & Points Oversight *(depends on Backend Phase 4 — Scoring Engine)*
21. ✅ Admin Phase 6 — League Moderation *(note: depends on Backend Phase 7 — Leagues; confirm your leagues backend actually exists before trusting this admin feature end-to-end)*
22. ✅ Admin Phase 7 — Job Queue & System Monitoring
23. ✅ Admin Phase 8 — Analytics
24. ✅ Admin Phase 9 — Security & Hardening
25. ⬜ Database Phase 11 — Cache Sync Layer (Redis ↔ React Query) *(cross-cutting — build alongside Backend Phases 4-8 and Frontend Phases 2-6, not as one isolated block)*
26. ⬜ Backend Phase 8 — Live Updates & Jobs (WebSockets)
27. ⬜ Frontend Phase 8 — Live Updates UI
28. ⬜ Backend Phase 9 — Caching & Performance
29. ⬜ Frontend Phase 9 — Polish & Performance
30. ⬜ Backend Phase 10 — Testing, Security & Deployment
31. ⬜ Frontend Phase 10 — Deployment
32. ⬜ Admin Phase 10 — Deployment *(final admin phase — do this last, after the main app is deployed and stable)*

---

## Important dependency flags (don't skip ahead blindly)

- **Admin Phase 5 (Scoring Oversight)** cannot really work until **Backend Phase 4 (Scoring Engine)** exists — if you jumped ahead on the admin track (which the screenshots suggest you did, since Admin is far ahead of Backend), Admin Phase 5's endpoints may currently be operating against a scoring engine that doesn't exist yet. Worth double-checking before marking it ✅.
- **Admin Phase 6 (League Moderation)** similarly depends on **Backend Phase 7 (Leagues)**. If leagues aren't built on the main backend yet, Admin Phase 6 may be UI/routes without real underlying data to moderate.
- **Database Phase 11 (Cache Sync)** isn't a single block to complete once — it should be threaded through Backend Phases 4-8 and their matching Frontend phases as each mutation/read-path gets built. I've placed it at step 25 as a checkpoint, but you'll actually touch it repeatedly before and after that point.

## Suggested immediate next step

Given the admin track is far ahead of the main backend/frontend track, the highest-leverage move right now is likely going back to finish **Backend Phase 3 (Squad Management)** and **Backend Phase 4 (Scoring Engine)** — both are prerequisites for several "✅" admin features to actually be meaningful rather than UI shells pointed at incomplete data.

Want me to write the Backend Phase 3 prompt again (from earlier in this conversation) so you can pick that thread back up?
