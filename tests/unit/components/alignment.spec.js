/**
 * Alignment cycle logic — mirrors Player.vue alignmentCycleNext().
 *
 * Rules:
 *  - Traveler: full three-step cycle  null → good → evil → null
 *  - Townsfolk / Outsider (base good): two-step  null → evil → null
 *  - Minion / Demon (base evil):       two-step  null → good → null
 */

// Extracted logic matching Player.vue: alignmentCycleNext(current)
// where `this.player.role.team` provides the team context.
function alignmentCycleNext(current, team) {
  if (team === "traveler") {
    if (current === null) return "good";
    if (current === "good") return "evil";
    return null;
  }
  const baseEvil = team === "minion" || team === "demon";
  const opposite = baseEvil ? "good" : "evil";
  return current === null ? opposite : null;
}

// ─────────────────────────────────────────────────────────────
// Townsfolk (base good team)
// ─────────────────────────────────────────────────────────────
describe("alignmentCycleNext — townsfolk", () => {
  it("null → evil", () => {
    expect(alignmentCycleNext(null, "townsfolk")).toBe("evil");
  });

  it("evil → null", () => {
    expect(alignmentCycleNext("evil", "townsfolk")).toBeNull();
  });

  it("good → null (unexpected state reset)", () => {
    expect(alignmentCycleNext("good", "townsfolk")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Outsider (base good team — same as townsfolk)
// ─────────────────────────────────────────────────────────────
describe("alignmentCycleNext — outsider", () => {
  it("null → evil", () => {
    expect(alignmentCycleNext(null, "outsider")).toBe("evil");
  });

  it("evil → null", () => {
    expect(alignmentCycleNext("evil", "outsider")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Minion (base evil team)
// ─────────────────────────────────────────────────────────────
describe("alignmentCycleNext — minion", () => {
  it("null → good", () => {
    expect(alignmentCycleNext(null, "minion")).toBe("good");
  });

  it("good → null", () => {
    expect(alignmentCycleNext("good", "minion")).toBeNull();
  });

  it("evil → null (unexpected state reset)", () => {
    expect(alignmentCycleNext("evil", "minion")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Demon (base evil team — same as minion)
// ─────────────────────────────────────────────────────────────
describe("alignmentCycleNext — demon", () => {
  it("null → good", () => {
    expect(alignmentCycleNext(null, "demon")).toBe("good");
  });

  it("good → null", () => {
    expect(alignmentCycleNext("good", "demon")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Traveler (full three-step cycle)
// ─────────────────────────────────────────────────────────────
describe("alignmentCycleNext — traveler", () => {
  it("null → good", () => {
    expect(alignmentCycleNext(null, "traveler")).toBe("good");
  });

  it("good → evil", () => {
    expect(alignmentCycleNext("good", "traveler")).toBe("evil");
  });

  it("evil → null", () => {
    expect(alignmentCycleNext("evil", "traveler")).toBeNull();
  });

  it("completes a full cycle back to null", () => {
    let state = null;
    state = alignmentCycleNext(state, "traveler"); // → good
    state = alignmentCycleNext(state, "traveler"); // → evil
    state = alignmentCycleNext(state, "traveler"); // → null
    expect(state).toBeNull();
  });
});
