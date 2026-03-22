# Feature: [Point Voting]

## Goal
Allow the Story Teller to initiate a "Point Vote" feature, that allows every Player in the town to point at the person they wish to vote for. In this state of Group Voting, the only thing that can happen is players can click on target player tokens to signify whom they are voting for, votes are tallied live and displayed to everyone, and the story teller can close votes with a timer count down.
When votes are closed, the tally is displayed and the highest vote / player denoted.

## Functional Requirements
- [1] Add a new menu item for the Story Teller to initiate a "Point Vote".
- [2] Create a new town state, similar to standard existing voting feature, that controls Point Voting.
- [3] In this state, any Player icon clicked on by a seated player denotes a Point Vote & is counted.
- [3a] In this state, click player icons will register a vote instead of opening the icon menu.
- [3b] Click registers a vote, no menu at all. Simple, no ambiguity.
- [4] Votes are tallied live, against target player.
- [5] Players can actively change their vote in this state.
- [6] A small hand icon shown near each player, is rotated to point at the target player.
- [7] Each player shows a number & list of player names, who are voting for them - dynamic, live list.
- [8] New 3 second count down when the Story Teller wants to end the Point Vote.
- [9] A player can vote for themselves
- [10] Highlight both players in case of a tie
- [11] Similar to the voting tally, we can show the highest vote in the middle of the screen:
- [11a] Highest Vote is for player X, Y. Vote Tally Z
- [12] The Story Teller cannot vote.
- [13] After a Point Vote is finished, there is a Close button to conclude that event.
- [14] Vote Tally:
- [14a] The session needs to keep count of votes per player
- [14b] Votes are incremented and decremented and players adjust their votes
- [14c] On top of a per-player vote tally, each player need to know who they are pointing at
- [14d] Therefore, we can build, in real-time a list of players pointing at each player & vote count.
- [15] After the countdown completes, a results screen is shown (instead of immediately closing).
- [15a] Results screen shows "Point Vote Result" title with the highest vote holder(s), their vote tally, and list of voters.
- [15b] In a tie, each tied player is listed separately with their voter names and tally.
- [15c] If no votes were cast, show "No votes were cast."
- [15d] ST gets a "Mark Target" button (grey) to mark the leading player with a skull — only shown when there is a single highest vote (no tie).
- [15e] ST gets a "Clear Mark" button (grey) to remove the skull mark.
- [15f] ST gets a "Close" button to dismiss the results screen.
- [15g] Vote count is critical & real-time & transmitted from player to session & back to all players.
- [16] Leader token(s) remain highlighted in gold after the countdown until Close is pressed.
- [17] On Close, if there is a single clear winner, a Point Vote entry is added to Vote History: Nominator = "N/A", Nominee = winning player, Type = "Point Vote", Majority = "N/A", Voters = list of names. Ties and no-vote games are not recorded.
- [18] Unseated players (no claimed seat) can still open the player menu during Point Vote, to allow late joining via seat claim.
- [19] Menu item and [P] hotkey toggle Point Vote — ST only. Menu label shows "Point Vote [P]" / "End Point Vote [P]".

## Build Phases:

- [1] Add the menu item for the Story Teller & on click enter Point Vote mode & modal.
- [2] In Point Vote mode, allow players to click on targets to get the count/display working
- [3] Ensure every player is seeing vote tallies live
- [4] Add Story Teller closure of the event & display result, and add Close button.
- [5] Add the hand icon next to each player that rotates to point at the target player icon.

# Proposed Build Phases
# Phase
# What gets built	How to verify
1 — State foundation	New Vuex state, mutations, and pointVoteLeaders getter in session.js	Vue DevTools: toggle pointVoteActive, cast votes, confirm computed leader updates
2 — ST Menu trigger	"Point Vote" menu item in Menu.vue that sets/clears state	Menu appears, clicking it toggles pointVoteActive in DevTools
3 — Click interception	Player.vue click guard + castPointVoteSync commit	Clicking tokens during point vote mode registers votes in DevTools; menu still works outside point vote
4 — Centre display	New PointVote.vue + wired into App.vue transition	Centre screen shows live leader text; updates as votes are cast
5 — Per-player tally	Vote count + voter name list overlay on each player token in Player.vue	Each token shows who's voting for them in real time
6 — Countdown + Close	"End Point Vote (3s)" countdown and "Close" button on PointVote.vue	Countdown fires, state clears after 3s; Close clears immediately
7 — Socket broadcast	All socket send/receive in socket.js + gamestate restore	Test with two browser tabs; votes sync between players

## Review Level
<!-- Choose one -->
- [ ] Quick — implement directly
- [ ] Standard — propose approaches, I approve, then build
- [X] Full review — Design → Build → QA loop

---
### Stage: Feature Complete

**Completed:**
- All 13 build phases done
- Full multiplayer socket sync including gamestate restore on rejoin
- Results screen, Vote History integration, gold highlight, hand icon, hotkey

**Build Phase Status:**

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ Done | Add `pointVoteActive`, `pointVotes`, `pointVoteCountdown` state + mutations + `pointVoteLeaders` getter to `src/store/modules/session.js` |
| 2 | ✅ Done | Add "Point Vote" menu item to `src/components/Menu.vue` |
| 3 | ✅ Done | Intercept token clicks in `src/components/Player.vue` to cast votes |
| 4 | ✅ Done | Create `src/components/PointVote.vue` centre-screen display + wire into `src/App.vue` |
| 5 | ✅ Done | Add per-player vote count + voter name overlay to `src/components/Player.vue` |
| 6 | ✅ Done | Add 3-second countdown + Close button to `PointVote.vue` |
| 7 | ✅ Done | Socket broadcasting in `src/store/socket.js` for multiplayer sync |
| 8 | ✅ Done | Results screen after countdown: vote tally, Mark Target / Clear Mark / Close buttons |
| 9 | ✅ Done | Hand icon near each player token, rotated to point at their voted target |
| 10 | ✅ Done | Gold highlight persists on leader token(s) through results screen until Close |
| 11 | ✅ Done | Vote History entry recorded on Close (single winner only) |
| 12 | ✅ Done | Unseated players can open menu during Point Vote to claim a seat |
| 13 | ✅ Done | [P] hotkey added to toggle Point Vote (ST only) |

**Key design decisions:**
- State map: `pointVotes: { [voterIndex]: targetIndex }` — one entry per voter, overwrite to change vote
- Must use `Vue.set()` when writing to `pointVotes` keys (Vue 2 reactivity requirement)
- ST cannot vote (guard in Player.vue); players can vote for themselves
- `pointVoteLeaders` is a Vuex getter — used by both `PointVote.vue` and `Player.vue` for tie highlighting
- Do not modify existing nomination/vote code — keep entirely separate
