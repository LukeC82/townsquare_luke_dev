# Feature: Victory Reveal

## Goal

Extend the existing "Good Wins / Evil Wins" buttons into a richer end-of-game ceremony.

Rather than immediately posting the victory screen, the Story Teller is first presented with a **Winner Selection screen** where they can confirm or adjust who the winners are. From there they have three choices: close without action, post the existing victory celebration to all players, and / or trigger a new **Grimoire Reveal** — a read-only, animated presentation of the ST's grimoire broadcast to every seated player, with a staged reveal that builds tension before landing on the final result.

---

## Functional Requirements

### A — Winner Selection Screen (ST only)

- [A1] Clicking "Good Wins" or "Evil Wins" opens a new **Winner Selection modal** instead of the current `confirm()` browser dialog.
- [A2] The modal shows the full town in a condensed circle — all player tokens visible — in a mode dedicated to selection.
- [A3] On open, the app **auto-selects winners** based on the following rules, applied in order:
  - [A3a] If a player has an explicit alignment set (`player.alignment === "good"` or `"evil"`), that alignment determines whether they are a winner for the declared team.
  - [A3b] If no explicit alignment is set (`player.alignment === null`), the player's role team is used as the default: `townsfolk` and `outsider` are treated as good; `demon` and `minion` are treated as evil.
  - [A3c] Travelers with no alignment are not pre-selected. Travelers with an explicit alignment follow rule A3a.
  - [A3d] Players with no role assigned (`player.role === {}`) are not pre-selected.
- [A4] The ST can toggle any player in or out of the winner set by clicking their token in the selection grid. ST can still toggle alignment of each player, for any final changes.
- [A5] Selected winners are highlighted with a **gold/yellow pulse glow** (a new `winner-glow` CSS animation distinct from the existing team glows).
- [A6] A player counter is displayed: "X winners selected" — updates live as the ST toggles.
- [A7] Three action buttons are shown at the bottom of the modal:
  - [A7a] **Close** — dismisses the modal, no state changes, no broadcast. Returns to the normal grimoire. Closes the Victory modal.
  - [A7b] **Declare Victory** — posts the standard `VictoryCelebration` overlay to all connected players (equivalent to the current confirm flow). Does not broadcast the grimoire. ST can dismiss and it returns to the Victory modal to then optionally present the final grimoire or close.
  - [A7c] **Reveal Grimoire** — broadcasts the ST's grimoire snapshot and the selected winner list to all seated players, triggering the Grimoire Reveal overlay (see section B).
- [A9] The selection modal is ST-only. Seated players never see this screen.
- [A10] The selection modal can be re-opened to change the winner set, even after a victory has been declared — the ST may wish to correct a mistake or re-send the reveal.

---

### B — Grimoire Reveal Overlay (Seated Players)

- [B1] When the ST fires "Reveal Grimoire", a full-screen **read-only overlay** appears on every seated player's screen.
- [B2] The overlay has a strongly coloured backdrop — the existing team-coloured effect from `VictoryCelebration.vue` (blue radial for good, red radial for evil) — so players immediately understand this is a special presentation, not their own grimoire.
- [B3] The overlay is **read-only**. No token clicks, no menus, no interactions except the exit button described in [B10].
- [B4] The overlay displays the **ST's grimoire as a snapshot** — names, roles, alignment indicators, and dead/alive state as they were at the moment of broadcast. This is a static copy, not a live feed; subsequent ST actions do not update it. No notes/reminders are displayed.
- [B5] The grimoire snapshot is laid out in the same circular token arrangement used in the main grimoire view, so it is visually familiar.
- [B6] Winning players are highlighted with the **gold/yellow pulse glow** (`winner-glow`) matching what the ST saw in the selection screen.

#### Reveal Animation Sequence

- [B7] The reveal plays out in three phases automatically on arrival:

  - **Phase 1 — Blank Grimoire (0 – ~1 s):**
    All tokens are shown as featureless silhouettes. Role images, names, alignment indicators, and dead shrouds are hidden. The backdrop and layout are visible, signalling something is about to happen.

  - **Phase 2 — Staggered Random Reveal (~1 s – ~4 s):**
    Tokens are revealed one by one in a randomised order, each with a short flip/pop transition (~200 ms per token). The randomness prevents players counting "the demon is always last" and builds genuine suspense. The pace can be tuned (target: roughly one reveal every 100–200 ms across the whole cast).

  - **Phase 3 — Final State (4 s+):**
    All tokens revealed. Winner tokens begin pulsing with the gold glow. The overlay is now static until dismissed.

- [B8] The reveal animation plays once on arrival. If a player re-opens the overlay (e.g. after a re-broadcast), the animation plays again from Phase 1.
- [B9] Dead players are revealed with their shroud already shown — the reveal exposes role + shroud together, not role then shroud separately.

#### Dismiss & Lifecycle

- [B10] A clearly visible **"Exit Presentation"** button (or similar) is always available so the player can dismiss the overlay at any time, including during Phase 1 or 2.
- [B11] Dismissal is **local only** — each player manages their own overlay independently. One player closing does not close it for others.
- [B12] The ST can **re-broadcast** the reveal (e.g. to players who missed it). This re-shows the overlay from Phase 1 for all players, including those who previously dismissed it.
- [B13] The ST can **clear the reveal** via the selection modal's Close button or a dedicated clear action, hiding the overlay for any player still viewing it.
- [B14] The overlay does **not** auto-dismiss on a timer (unlike the 20-second Victory Celebration). Players are trusted to exit when ready. (Open to review.)

---

### C — Data & State

- [C1] A new snapshot object must be constructed at broadcast time containing only the data needed for the overlay: `{ players: [...snapshot], winners: [indices], winningTeam: "good"|"evil" }`. This is not a live reference to the Vuex player array — it must be a deep copy.
- [C2] Snapshot per-player fields: `name`, `role` (full object with `id`, `name`, `team`, `image`), `alignment`, `isDead`, `pronouns`. Reminders and socket IDs are not needed.
- [C3] New session state: `victoryRevealActive: false`, `victoryRevealSnapshot: null`.
- [C4] On gamestate restore (`gs` message), new joiners receive the current `victoryRevealActive` and `victoryRevealSnapshot` values and see the overlay if active, but the animation plays from Phase 1 for them.
- [C5] The winner selection state (which players are ticked) is **local to the ST's modal** and is not persisted to Vuex or broadcast until the ST commits an action. It is re-computed from current player alignment on each modal open.

---

### D — Socket

- [D1] New socket message type `"victoryReveal"` — payload: `{ players: [...snapshot], winners: [indices], winningTeam: "good"|"evil" }` or `null` to clear.
- [D2] `sendVictoryReveal(payload)` method on the socket class, ST-only.
- [D3] Receiving clients handle `case "victoryReveal"`: commit the snapshot to session state and trigger the overlay.
- [D4] Clearing (`null` payload): commit `clearVictoryReveal` mutation, hiding the overlay for any player still viewing.

---

## Design Decisions to Confirm Before Build

| # | Question | Options |
|---|---|---|
| 1 | Should "Reveal Grimoire" always also fire "Declare Victory" (victory sound + celebration)? | (a) Always both, (b) Separately, ST chooses, (c) Reveal Grimoire implies Victory | Option (B)
| 2 | Should the overlay auto-dismiss after a timer? | (a) Yes, 30–60s, (b) No, player-controlled only | Answer - (B)
| 3 | Phase 2 pacing — how fast should the reveal be? | ~100ms/token (snappy), ~200ms/token (dramatic), adjustable config | answer - 200ms.
| 4 | Should the ST's own screen show the overlay too, or only seated players? | (a) Everyone including ST, (b) Seated players only | ST to se it also, share in the victory.
| 5 | What happens to the reveal if the game state changes (new night, etc.) while the overlay is showing? | (a) Overlay persists until dismissed, (b) ST action auto-clears it | answer (A)
| 6 | Reveal Grimoire with no winners selected — is this valid? | (a) Allowed (presents grimoire, no gold glow), (b) Require at least 1 winner | Answer - there must be a winner, good or evil.

---

## Proposed Build Phases

| Phase | What Gets Built | How to Verify |
|---|---|---|
| 1 — Selection Modal (static) | `VictoryModal.vue` with player grid, auto-select logic (A3), gold glow on selected, player counter, three buttons (Close / Declare Victory stub / Reveal Grimoire stub). Wire "Good Wins" / "Evil Wins" in Menu.vue to open this modal instead of `confirm()`. | Open modal, verify auto-selection matches team/alignment rules, toggle players, observe gold glow. |
| 2 — Declare Victory wired | "Declare Victory" button in VictoryModal fires `session/declareVictory` and closes modal. Replaces old `confirm()` path entirely. | Clicking Declare Victory shows VictoryCelebration on all clients. |
| 3 — State & Socket foundation | Add `victoryRevealActive`, `victoryRevealSnapshot` to `session.js`. Add `sendVictoryReveal` + `clearVictoryReveal` + message handler in `socket.js`. Include in gamestate restore. | Vue DevTools: verify state set/clear on broadcast. Two tabs: snapshot appears in both. |
| 4 — Reveal Overlay (static) | `VictoryReveal.vue` overlay — backdrop, token grid from snapshot, winner glow, Exit button. No animation yet. | Trigger reveal from ST tab, overlay appears on player tab with correct names/roles/winners highlighted. Exit dismisses locally only. |
| 5 — Reveal Animation | Phase 1 blank silhouettes → Phase 2 staggered random reveal → Phase 3 winner glow. Timing config in component data. | Watch Phase 1→2→3 play through. Verify randomness on repeated triggers. Verify re-broadcast resets to Phase 1. |
| 6 — Gamestate Restore | Rejoin while reveal is active; late-joining player gets snapshot and animation plays for them from Phase 1. | Mid-reveal: close and reopen browser tab. Verify overlay appears from Phase 1 on rejoin. |
| 7 — ST Clear & Re-broadcast | Re-opening selection modal after a reveal; "Close" clears the reveal on all clients; re-sending replays Phase 1 for everyone. | Send reveal, have player dismiss, re-send from ST — verify player overlay reappears. |
| 8 — Polish & Edge Cases | Handle no-role players gracefully in selection, handle empty player list, add victory + reveal concurrent flow, CSS refinements. | Edge case testing with partial grimoires and small player counts. |

---

## Component & File Map

| File | Role |
|---|---|
| `src/components/VictoryModal.vue` | New — ST winner selection screen |
| `src/components/VictoryReveal.vue` | New — seated player presentation overlay |
| `src/components/Menu.vue` | Change "Good/Evil Wins" click handlers to open VictoryModal |
| `src/store/modules/session.js` | Add `victoryRevealActive`, `victoryRevealSnapshot`, mutations |
| `src/store/socket.js` | Add `sendVictoryReveal`, `case "victoryReveal"`, gamestate fields |
| `src/App.vue` | Register and render VictoryModal and VictoryReveal |
| `src/components/VictoryCelebration.vue` | Unchanged — still fires independently when victory declared |

---

## Review Level

- [ ] Quick — implement directly
- [ ] Standard — propose approaches, I approve, then build
- [X] Full review — Design → Build → QA loop
