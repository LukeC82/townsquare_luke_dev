# Grimoire Reveal — Order Conditions

This document defines the rules that `buildRevealOrder()` uses to produce the reveal sequence.
It is the single source of truth for reveal ordering logic.
Update this file first, then implement.

---

## Inputs

| Name | Type | Description |
|------|------|-------------|
| `snapshotPlayers` | `Player[]` | Full player list at time of broadcast |
| `team` | `"good"` \| `"evil"` | Winning team |

Each `Player` has: `isDead`, `role.team` (`"townsfolk"`, `"outsider"`, `"minion"`, `"demon"`, `"traveler"`), `alignment` (`"good"` \| `"evil"` \| `null`).

**Effective alignment** — used throughout:
- If `player.alignment` is set explicitly → use it
- Otherwise derive from `role.team`: townsfolk/outsider → `good`; minion/demon → `evil`; traveler → `null`

---

## Outputs

| Name | Type | Description |
|------|------|-------------|
| `revealOrder` | `number[]` | Ordered player indices for the primary (one-by-one) reveal |
| `finalThree` | `boolean` | Whether the simultaneous pair-reveal animation should fire |
| `finalPair` | `number[]` | Two player indices held back for the simultaneous reveal; empty when `finalThree` is false |

---

## Rules

Rules are evaluated **in priority order** within each team. The first matching rule wins.

---

## Good Victory Rules

### Rule 1a — Good Win FinalPair

**Priority:** 1 (good wins)

**Trigger:** Winning team is **good** AND at least **1 alive evil** player exists AND at least **1 alive good** player exists.

**Effect:** Pick one random alive evil player and one random alive good player → `finalPair`. All remaining players fill `revealOrder` in random order. `finalThree = true`.

This applies to any game size — it fires for both 2-alive and 3+-alive good victories.

Evil players are revealed with the **shockwave-animation** visual effect.

---

### Rule 1a-B — Good Win Sequential (2 alive, both good)

**Priority:** 2 (good wins — fallthrough from Rule 1a when no alive evil exists)

**Trigger:** Winning team is **good** AND exactly **2 players alive** AND both alive players are good AND a dead evil-aligned demon exists.

**Effect:** Sequential tail — no `finalPair`. `finalThree = false`.

| Position | Player |
|----------|--------|
| Third-to-last | Dead, evil-aligned demon |
| Last two | The two alive good players in random order |

All other players fill the front of `revealOrder` randomly.

**Fallthrough:** If no dead evil-aligned demon exists, skip to Rule 2.

---

## Evil Victory Rules

### Rule 1b — Evil Win, 2 Alive

**Priority:** 1 (evil wins)

**Trigger:** Winning team is **evil** AND exactly **2 players alive** AND an alive demon exists.

**Effect:** The alive demon and the other alive player → `finalPair`. All remaining players in `revealOrder` randomly. `finalThree = true`.

All remaining evil players are revealed with the **shockwave-animation** visual effect.

**Fallthrough:** If no alive demon exists, skip to Rule 2.

---

### Rule 1c — Evil Win, Unusual (>2 alive, alive evil demon)

**Priority:** 2 (evil wins — unusual victory condition)

**Trigger:** Winning team is **evil** AND **more than 2 players alive** AND an alive **evil-aligned** demon exists.

**Effect:** Two sub-cases:

| Condition | Outcome |
|-----------|---------|
| Alive good player exists | `finalPair` = [demon, random alive good]. `finalThree = true`. |
| No alive good players (all alive are evil) | Demon placed **last** in `revealOrder`. No `finalPair`. `finalThree = false`. |

All remaining evil players are revealed with the **shockwave-animation** visual effect.

---

### Rule 1d — Evil Win, Unusual (>2 alive, dead demon)

**Priority:** 3 (evil wins — unusual victory condition, dead demon)

**Trigger:** Winning team is **evil** AND **more than 2 players alive** AND no alive evil-aligned demon AND at least **1 alive evil** player exists.

**Effect:** Create a `finalPair` from alive players if possible. `finalThree = true`.

| Priority | Pair |
|----------|------|
| First choice | Alive evil + alive good |
| Second choice | Two alive evil players |
| Cannot pair (only 1 alive evil, no alive good) | Fall through to Rule 2 |

**Fallthrough:** If no alive evil exists, or only 1 alive evil with no alive good → skip to Rule 2.

---

## Rule 2 — Standard Tail

**Priority:** Fallback — applies when no higher rule matches.

**Trigger:** None — catches all remaining cases.

**Effect:** All players shuffled randomly. One representative per alignment extracted and appended to the tail. Evil players revealed with the **shockwave-animation** visual effect.

- Only **alive** players qualify for the tail slots — dead players remain in the body and are naturally sorted to the front by the dead-before-alive ordering
- **Losing team** goes second-to-last
- **Winning team** goes last

**Tail order:** `[…rest…, losing-team representative, winning-team representative]`

If only one alignment is present, only one representative is appended.

---

## Shockwave-Animation

Evil-aligned players receive a distinct reveal animation across all rules. This applies to:
- Players with `effectiveAlignment === "evil"`
- Applies during primary reveal and simultaneous reveal

Implemented as a CSS `::before` pseudo-element on `.reveal-token-wrap` — a red ring that expands and fades using the `shockwave-ring` keyframe. The token itself still uses the standard `token-pop`.

---

## Sequence Summary

```
Good win:
  Rule 1a  → finalPair (alive evil + alive good) — any game size
  Rule 1a-B → sequential tail (dead demon + alive goods) — 2 alive, all good
  Rule 2   → standard tail

Evil win:
  Rule 1b  → finalPair (demon + other alive) — exactly 2 alive
  Rule 1c  → finalPair (demon + alive good) OR demon last — >2 alive, alive demon
  Rule 1d  → finalPair (evil + evil/good) if possible — >2 alive, dead demon
  Rule 2   → standard tail
```

---

## Reveal Phase Order (VictoryReveal.vue)

| Phase | What happens |
|-------|-------------|
| 1 | 1 s blank — all tokens shown as silhouettes; dead players show their shroud overlay immediately |
| 2 | Primary tokens revealed one-by-one per `revealOrder` (650 ms/token) |
| 3 | **When `finalThree = true`:** 1 s pause → 1 s simultaneous shake → pair pops with shockwave ring |
| 4 | Persona / true-role tokens revealed (450 ms each, random order) |
| 5 | Demon Bluffs + Fabled & Loric panels fade in (1 200 ms after Phase 4 ends) |

---

## Implementation Notes (code behaviour not driven by the above rules)

### VictoryReveal.vue — local fallback order

`startReveal()` compares the incoming `snapshot.revealOrder` length against the expected player count. If it is absent or mismatched (e.g. a client joins mid-reveal with a stale snapshot), it generates a local fallback order using **Rule 2 logic only** (standard tail, no Rules 1a–1d). `finalPairIndices` is still read from `snapshot.finalThree` / `snapshot.finalPair`, so the simultaneous-reveal animation still fires correctly even on the fallback path — only the primary ordering may differ.

### buildRevealOrder — pair extraction order

The two finalPair indices are extracted highest-position-first to avoid index-shift bugs when splicing from the shuffled array. The pair is stored as `[higherIndex, lowerIndex]`; VictoryReveal.vue treats them as an unordered set so the internal order does not affect the animation.
