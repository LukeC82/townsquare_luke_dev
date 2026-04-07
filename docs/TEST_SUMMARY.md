# Unit Test Summary

**Total: 119 tests across 5 suites — all passing.**

---

## Test Suites

### `tests/unit/store/session.spec.js` — Session Store (37 tests)

Tests the Vuex `session` module in isolation using a real Vuex store.

| Group | Coverage |
|---|---|
| Initial state | Verifies all default values (`gameEnded`, `winningTeam`, `victoryCount`, `isNight`, flags, `pointVotes`, `voteHistory`, `nomination`, `lockedVote`) |
| Victory mutations | `declareVictory` sets state and increments `victoryCount`; `clearVictory` resets; `setVictoryCount` sets directly; repeat-team re-declaration still increments |
| Toggle mutations | `toggleNight`, `toggleHiddenVoting`, `toggleReturnToTown` flip correctly; `toggleNight` accepts forced value |
| `pointVoteLeaders` getter | No-vote empty array; single leader; tied leaders; all votes same target |
| `setPointVoteActive` | Activation resets `pointVotes`/countdown/ended; deactivation preserves votes |
| `castPointVote` | Records vote; removes on `null` target; overwrites existing voter |
| `removePlayerFromPointVotes` | Drops all votes involving removed player; decrements higher indices; no-op when vote inactive |
| Nomination & vote | `nomination` sets all fields; clears without args; `lockVote` increments or sets directly |
| `addHistory` | ST records completed nomination with correct nominator/nominee/votes/majority; spectator blocked without permission; allowed with permission; not recorded if vote incomplete or no nomination |
| `addPointVoteHistory` | Single leader recorded; correct voter names; tie not recorded; no votes not recorded; spectator permission respected |
| `clearVoteHistory` | Empties history array |

---

### `tests/unit/store/players.spec.js` — Players Store (43 tests)

Tests the Vuex `players` module integrated with the `session` module.

| Group | Coverage |
|---|---|
| `add` | Name stored correctly; all NEWPLAYER defaults initialised (`isDead`, `isVoteless`, `handRaised`, `alignment`, `role`, `reminders`, `pronouns`); multiple players appended in order |
| `remove` | Removes by index; removes from middle of list |
| `swap` | Exchanges two players; works for non-adjacent players |
| `move` | Moves player to new position, shifting others |
| `update` | Updates boolean, string, and object properties; no-op for player not in list |
| `resetAllAlignments` | Sets all alignments to `null`; safe on empty list |
| `clear` | Empties `players`, `bluffs`, and `fabled` |
| `alive` getter | Correct count excluding dead players; full count; zero when all dead |
| `nonTravelers` getter | Excludes traveler-team players; capped at 15 |
| `nightOrder` getter | Returns a Map with correct size; orders by `firstNight`/`otherNight` position |
| `clearRoles` action | ST resets role/isDead/isVoteless/alignment; spectator preserves traveler roles; spectator clears non-traveler roles; always clears reminders |
| `randomize` action | Preserves all player names after shuffle; player count unchanged |

---

### `tests/unit/components/VictoryCelebration.spec.js` — Victory Celebration Component (25 tests)

Tests component methods directly via `method.call(mockContext)` without mounting.

| Group | Coverage |
|---|---|
| `particleStyle` | Returns all required CSS variable keys (`--angle`, `--delay`, `--size`, `--distance`); particles 1 and 21 are 180° apart; correct units (`deg`, `s`, `px`, `vh`) |
| `fadeOutSound` | Pauses audio after all fade ticks; clears `audioInstance` immediately; no-op when `audioInstance` is null; cancels duration timer |
| `onVictoryDeclared` | Resets `dismissed` to false; sets 20-second auto-dismiss timer; cancels previous dismiss timer on re-declaration (fires only once); calls `playSound` |
| `dismiss` | Sets `dismissed` to true; calls `fadeOutSound`; ST commits `session/clearVictory`; spectator (seated player) does NOT commit |
| `playSound` | No-op when muted; plays correct preloaded audio for winning team; sets `volume` and `currentTime` from config; schedules `fadeOutSound` after configured duration; pauses existing audio before playing new |

---

### `tests/unit/components/PointVote.spec.js` — Point Vote Component (20 tests)

Tests component methods and computed properties via `method.call(mockContext)`.

| Group | Coverage |
|---|---|
| `votersForPlayer` | Returns names of all voters for a target; empty array when no votes for target; empty when `pointVotes` is empty; filters null entries for out-of-range indices; all-votes-same-target case |
| `leaderVoteCount` (computed) | Returns 0 with no leaders; counts votes for leading player; uses `leaders[0]` on tie |
| `centerText` (computed) | "No votes yet" with no leaders; includes leader name and vote tally; includes all tied leader names |
| `markTarget` | Commits `setMarkedPlayer` with leader index; uses `leaders[0]` on tie; no-op with no leaders |
| `clearMark` | Commits `setMarkedPlayer` with `-1` |
| `closeResults` | Commits `addPointVoteHistory` with players then commits `setPointVoteEnded` false |

---

### `tests/unit/components/alignment.spec.js` — Alignment Cycle Logic (14 tests)

Tests the `alignmentCycleNext(current, team)` function extracted from `Player.vue`.

| Team | Coverage |
|---|---|
| `townsfolk` (base good) | `null → evil`; `evil → null`; `good → null` (unexpected reset) |
| `outsider` (base good) | `null → evil`; `evil → null` |
| `minion` (base evil) | `null → good`; `good → null`; `evil → null` (unexpected reset) |
| `demon` (base evil) | `null → good`; `good → null` |
| `traveler` (3-step cycle) | `null → good`; `good → evil`; `evil → null`; full cycle completes back to `null` |

---

## Test Infrastructure

| File | Purpose |
|---|---|
| `jest.config.js` | Jest 27 configuration — jsdom environment, test glob, module aliases, transforms |
| `babel.config.js` | Babel preset-env targeting current Node for Jest transforms |
| `tests/vueTransform.js` | Lightweight `.vue` transformer — extracts `<script>` block and processes via `@babel/core` |
| `tests/__mocks__/fileMock.js` | Stub for static assets (mp3, png, svg, etc.) |

All tests run with `npm test` (alias for `jest`).
