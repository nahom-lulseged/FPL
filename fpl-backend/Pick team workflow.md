# Captain, Vice-Captain & Starting XI Selection — Workflow & Button Actions

The step immediately after the 15-man squad is confirmed (see
`squad-selection-workflow.md`). On the real FPL product this is the
"Pick Team" screen; in this clone it maps to the tail end of Frontend
roadmap **Phase 2 — Team Creation (Squad Builder)**, using the
`PitchFormation` component from `ui-design.md`.

---

## 1. Page anatomy

```
┌───────────────────────────────────────────────────────────┐
│  Formation selector        Budget/Transfers info (locked)   │
├───────────────────────────────────────────────────────────┤
│                                                             │
│                  PITCH (11 starters)                        │
│         GK                                                  │
│     DEF  DEF  DEF  DEF                                        │
│     MID   MID   MID   MID                                     │
│         FWD   FWD                                             │
│                                                             │
├───────────────────────────────────────────────────────────┤
│  BENCH (4 players, ordered — 1 GK + 3 outfield)              │
├───────────────────────────────────────────────────────────┤
│           [ Auto Fill ]   [ Reset ]   [ Confirm Team → ]     │
└───────────────────────────────────────────────────────────┘
```

All 15 players from the confirmed squad are already present — this
screen never adds/removes players from the squad itself, it only
arranges the 15 into "11 starters + 4 bench" and assigns armbands.

---

## 2. Elements & actions

| Element | Type | Action / behavior |
|---|---|---|
| **Formation selector** (e.g. "4-4-2", "3-5-2") | dropdown or preset buttons | Changes the pitch layout. Switching formation re-flows which of the currently-starting players occupy which row, but does not change *who* is starting — if the new formation needs, say, one fewer defender than currently placed, the excess defender is auto-moved to bench (lowest-priority one, or prompts the user to choose). |
| **Player token on pitch** | draggable/tappable | Tap-to-select then tap-target (or drag-and-drop with a non-drag fallback per Frontend `skill.md` accessibility rule) to swap positions with a bench player, or with another on-pitch player of a compatible position. |
| **Player token on bench** | draggable/tappable | Same swap mechanic in reverse — promotes a bench player into a vacated pitch slot. |
| **Captain armband icon** (on a starter) | toggle button | Tapping opens a "Make Captain" confirmation or directly assigns the armband to that player, removing it from whoever held it before. Only one captain at a time, and captain **must** be a starter (not on bench). |
| **Vice-captain armband icon** | toggle button | Same mechanic, independent of captain. Must differ from the captain (enforced — selecting the same player for VC auto-prompts to pick another, or is simply disabled on the current captain's token). |
| **Bench order handles** (drag or up/down arrows, positions 1–4 of the bench strip) | reorder control | Sets autosub priority: if a starter scores 0 minutes, bench slot 1 is the first auto-sub candidate, then slot 2, etc. Slot 1 of the bench is conventionally reserved for the backup goalkeeper only if the starting GK doesn't play; outfield bench order (slots 2–4) is fully user-set. |
| **Auto Fill** | button | Automatically arranges the current 15 into a sensible valid starting XI + bench (e.g. highest recent form/points as starters) and assigns captain/vice-captain by the same heuristic. User can still manually adjust afterward. |
| **Reset** | button | Reverts to the last-saved arrangement (not the empty state — there's always *a* valid arrangement once 15/15 exists). Should confirm before discarding unsaved changes. |
| **Confirm Team** (primary CTA) | button | Disabled until the arrangement is fully valid (see §3). On click: `PATCH /squads/:id` with the starting XI, bench order, and captain/vice-captain — backend re-validates and persists; success routes to `/my-team`. |

---

## 3. Validation rules enforced (client preview + server truth)

| Rule | Client-side UX | Server-side enforcement |
|---|---|---|
| Exactly 11 starters, 4 bench | Pitch always shows 11 filled slots; any attempted 12th starter forces a swap-out choice rather than allowing 12 on the pitch. | `errorCode: INVALID_LINEUP_SIZE` if violated. |
| Valid formation (1 GK, 3–5 DEF, 2–5 MID, 1–3 FWD among starters) | Formation selector only offers legal presets; manual swaps that would break the active formation are blocked with an inline reason ("You need at least 3 defenders"). | `errorCode: INVALID_FORMATION`. |
| Captain and Vice-Captain both must be starters | Armband controls are only available on pitch (starter) tokens, not bench tokens. | `errorCode: CAPTAIN_MUST_BE_STARTER`. |
| Captain ≠ Vice-Captain | Selecting a player as VC who is already Captain is disabled/no-ops with a message. | `errorCode: CAPTAIN_VC_CONFLICT`. |
| Bench GK slot is a goalkeeper | The bench's designated GK slot only accepts the squad's 2nd goalkeeper — you can't put an outfield player there. | `errorCode: INVALID_BENCH_GK`. |
| Deadline not yet passed | If the countdown hits zero while the user is on this screen, the CTA disables immediately and a banner explains the team is now locked for this gameweek. | `errorCode: DEADLINE_PASSED` — this is the authoritative check; client countdown is just a UX mirror (server time is source of truth, per Frontend `rule.md` #4). |

---

## 4. End-to-end workflow

1. User arrives here right after confirming their 15-man squad (or
   returns later from `/my-team` in "edit lineup" mode during an open
   transfer window).
2. Default state: a reasonable starting arrangement is pre-filled
   (e.g. by points/form) so the screen is never blank — but nothing is
   "confirmed" yet.
3. User optionally changes **formation**, then fine-tunes by
   swapping specific players between pitch and bench.
4. User taps the **captain armband** on their preferred starter, then
   the **vice-captain armband** on a different starter.
5. User optionally reorders the bench for autosub priority.
6. **Confirm Team** becomes enabled once all rules in §3 pass.
7. On submit, backend re-validates and persists; user is routed to
   `/my-team`, where this arrangement now drives live scoring for the
   upcoming gameweek (captain's points doubled, autosubs applied per
   bench order if a starter records 0 minutes — see
   `docs/fpl-workflow.md` step ⑥).

---

## 5. Notes for the fpl-ethiopia clone

- This screen and the squad-selection screen are sometimes merged into
  a single flow on mobile (pick 15, then immediately arrange XI, in one
  continuous scroll) rather than two separate pages — a reasonable UX
  simplification worth considering for Phase 2, as long as both
  validation rule-sets (§4 of squad-selection doc + §3 here) still run
  independently and in the right order (squad legality before lineup
  legality).
- The chip **Triple Captain** interacts with this screen: activating it
  doesn't change the UI here beyond marking the current captain's
  armband as "tripled" for this gameweek — no separate selection step.
- **Bench Boost** interacts with this screen differently: it doesn't
  change the arrangement UI at all, it changes what happens *after*
  submission (all 15 players' points count that gameweek instead of just
  the 11 starters) — worth a small indicator/banner on this screen when
  active so users understand bench arrangement still matters less than
  usual that week, but isn't irrelevant (a badly-placed bench player
  still counts, they just don't get autosub priority the same way).