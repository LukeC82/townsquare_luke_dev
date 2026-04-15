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

## Global Ordering — Dead Before Alive

After all rule logic is applied, **dead players are always revealed before alive players** within the body (non-tail portion of `revealOrder`). This sort is applied globally across every rule.

- The **body** is everything in `revealOrder` except the tail (the intentionally-ordered players placed at the end by the active rule).
- Within the dead group and within the alive group, the original shuffle order is preserved (stable sort).
- The tail is never touched by this sort — players in `finalPair` are separate and also unaffected.

When a rule description below says "remaining players fill the body in random order", it means random within each dead/alive group.

---

## Rules

Rules are evaluated **in priority order** within each team. The first matching rule wins.

---

## Good Victory Rules

### Rule 1a — Good Win FinalPair

**Priority:** 1 (good wins)

**Trigger:** Winning team is **good** AND at least **1 alive evil** player exists AND at least **1 alive good** player exists.

**Effect:** The first alive evil and first alive good player found in the shuffled order → `finalPair`. All remaining players fill the body in random order (dead before alive). `finalThree = true`.

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
| Last two | The two alive good players in their shuffled order |

All other players fill the front of `revealOrder` in random order (dead before alive).

**Fallthrough:** If no dead evil-aligned demon exists, skip to Rule 2.

---

## Evil Victory Rules

### Rule 1b — Evil Win, 2 Alive

**Priority:** 1 (evil wins)

**Trigger:** Winning team is **evil** AND exactly **2 players alive** AND an alive demon exists (any alignment — no effective-alignment check is applied here).

**Effect:** The alive demon and the other alive player → `finalPair`. All remaining players in the body in random order (dead before alive). `finalThree = true`.

All evil players are revealed with the **shockwave-animation** visual effect (including the demon in the simultaneous reveal).

**Fallthrough:** If no alive demon exists, skip to Rule 2.

---

### Overwhelming Evil Victory — All Alive Players Are Evil

**Priority:** 1 (evil wins — checked before Rules 1c/1d)

**Trigger:** Winning team is **evil** AND **more than 2 players alive** AND **every** alive player is evil-aligned (effective alignment `"evil"`; alive travelers with null alignment prevent this rule from firing).

**Effect:** Every alive player is collected into `finalPair`. All dead players are revealed one-by-one in the primary sequence. `finalThree = true`.

This produces the most dramatic possible reveal — the entire surviving evil team shakes and pops simultaneously. Dead players (any alignment) are revealed first in the primary sequence, then the full living evil contingent appears together.

---

### Rule 1c — Evil Win, Unusual (>2 alive, alive evil demon)

**Priority:** 2 (evil wins — unusual victory condition)

**Trigger:** Winning team is **evil** AND **more than 2 players alive** AND an alive **evil-aligned** demon exists.

**Effect:** Two sub-cases:

| Condition | Outcome |
|-----------|---------|
| Alive good player exists | `finalPair` = [demon, first alive good in shuffled order]. `finalThree = true`. |
| No alive good players (all alive are evil) | Demon placed **last** in `revealOrder`. No `finalPair`. `finalThree = false`. |

Remaining body players in random order (dead before alive). All evil players are revealed with the **shockwave-animation** visual effect.

---

### Rule 1d — Evil Win, Unusual (>2 alive, dead demon)

**Priority:** 3 (evil wins — unusual victory condition, dead demon)

**Trigger:** Winning team is **evil** AND **more than 2 players alive** AND no alive evil-aligned demon AND at least **1 alive evil** player exists.

**Effect:** Create a `finalPair` from alive players if possible. `finalThree = true`.

| Priority | Pair |
|----------|------|
| First choice | First alive evil + first alive good (in shuffled order) |
| Second choice | First alive evil + second alive evil (in shuffled order) |
| Cannot pair (only 1 alive evil, no alive good) | Fall through to Rule 2 |

Remaining body players in random order (dead before alive).

**Fallthrough:** If no alive evil exists, or only 1 alive evil with no alive good → skip to Rule 2.

---

## Rule 2 — Standard Tail

**Priority:** Fallback — applies when no higher rule matches.

**Trigger:** None — catches all remaining cases.

**Effect:** All players shuffled randomly. One alive representative per alignment extracted and appended to the tail. Evil players revealed with the **shockwave-animation** visual effect.

- Only **alive** players qualify for the tail slots — dead players remain in the body where the dead-before-alive sort places them before the alive body players
- **Losing team** goes second-to-last
- **Winning team** goes last

**Tail order:** `[…body (dead before alive)…, losing-team representative, winning-team representative]`

If only one alignment has an alive representative, only one player is appended to the tail.

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
  Rule 1b          → finalPair (demon [any alignment] + other alive) — exactly 2 alive
  Overwhelming     → ALL alive in finalPair — >2 alive, all alive are evil
  Rule 1c          → finalPair (evil demon + alive good) OR demon last — >2 alive, alive evil demon, alive good/traveler present
  Rule 1d          → finalPair (evil + evil/good) if possible — >2 alive, dead demon, alive good/traveler present
  Rule 2           → standard tail
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

`startReveal()` compares the incoming `snapshot.revealOrder` length against the expected player count. If it is absent or mismatched (e.g. a client joins mid-reveal with a stale snapshot), it generates a local fallback order using a **Rule 2-style tail** (no Rules 1a–1d).

The fallback `featuredPos` is alive-only, matching the main `buildRevealOrder` Rule 2 — if no alive representative of an alignment exists that slot is omitted from the tail. `finalPairIndices` is still read from `snapshot.finalThree` / `snapshot.finalPair`, so the simultaneous-reveal animation still fires correctly even on the fallback path — only the primary ordering may differ.

### buildRevealOrder — pair extraction order

The two finalPair indices are extracted highest-position-first to avoid index-shift bugs when splicing from the shuffled array. The pair is stored as `[higherIndex, lowerIndex]`; VictoryReveal.vue treats them as an unordered set so the internal order does not affect the animation.

### buildRevealOrder — dead-before-alive sort scope

`tailLength` tracks how many elements at the end of `order` were placed there intentionally by the active rule and must not be reordered. The dead-before-alive stable sort is applied only to `order[0 .. order.length - tailLength]`. For rules that use `finalPair` (which is held separately), `tailLength` is 0 and the entire `order` array is sorted.
