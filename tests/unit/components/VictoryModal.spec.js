import VictoryModal from "@/components/VictoryModal.vue";

const {
  initWinners,
  toggleWinner,
  close,
  declareVictory,
  cycleAlignment,
  revealGrimoire
} = VictoryModal.methods;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const makePlayer = (name, team, alignment = null, isDead = false) => ({
  name,
  isDead,
  alignment,
  pronouns: "",
  role: team ? { id: team + "_1", name, team, image: "" } : {}
});

const makeCtx = (team, players, winners = null) => ({
  team,
  players,
  winners: winners !== null ? winners : players.map(() => false),
  selectedCount: 0, // not used by these methods directly
  $set(arr, idx, val) {
    arr[idx] = val;
  },
  $store: { commit: jest.fn() }
});

// ─────────────────────────────────────────────────────────────
// initWinners — auto-selection logic
// ─────────────────────────────────────────────────────────────
describe("VictoryModal — initWinners (Good Win)", () => {
  const players = [
    makePlayer("Alice", "townsfolk"),
    makePlayer("Bob", "outsider"),
    makePlayer("Charlie", "minion"),
    makePlayer("Dave", "demon"),
    makePlayer("Eve", "traveler")
  ];

  it("selects townsfolk and outsider for a good win", () => {
    const ctx = makeCtx("good", players);
    initWinners.call(ctx);
    expect(ctx.winners[0]).toBe(true); // townsfolk
    expect(ctx.winners[1]).toBe(true); // outsider
    expect(ctx.winners[2]).toBe(false); // minion
    expect(ctx.winners[3]).toBe(false); // demon
    expect(ctx.winners[4]).toBe(false); // traveler — no alignment
  });

  it("respects explicit good alignment over team (minion aligned good → selected)", () => {
    const overridePlayer = makePlayer("Charlie", "minion", "good");
    const ctx = makeCtx("good", [overridePlayer]);
    initWinners.call(ctx);
    expect(ctx.winners[0]).toBe(true);
  });

  it("respects explicit evil alignment over team (townsfolk aligned evil → not selected)", () => {
    const overridePlayer = makePlayer("Alice", "townsfolk", "evil");
    const ctx = makeCtx("good", [overridePlayer]);
    initWinners.call(ctx);
    expect(ctx.winners[0]).toBe(false);
  });

  it("does not select travelers with no alignment for a good win", () => {
    const traveler = makePlayer("Traveller", "traveler", null);
    const ctx = makeCtx("good", [traveler]);
    initWinners.call(ctx);
    expect(ctx.winners[0]).toBe(false);
  });

  it("selects a traveler with explicit good alignment for a good win", () => {
    const traveler = makePlayer("Traveller", "traveler", "good");
    const ctx = makeCtx("good", [traveler]);
    initWinners.call(ctx);
    expect(ctx.winners[0]).toBe(true);
  });

  it("does not select players with no role assigned", () => {
    const noRole = {
      name: "Empty",
      isDead: false,
      alignment: null,
      pronouns: "",
      role: {}
    };
    const ctx = makeCtx("good", [noRole]);
    initWinners.call(ctx);
    expect(ctx.winners[0]).toBe(false);
  });
});

describe("VictoryModal — initWinners (Evil Win)", () => {
  const players = [
    makePlayer("Alice", "townsfolk"),
    makePlayer("Bob", "outsider"),
    makePlayer("Charlie", "minion"),
    makePlayer("Dave", "demon")
  ];

  it("selects minion and demon for an evil win", () => {
    const ctx = makeCtx("evil", players);
    initWinners.call(ctx);
    expect(ctx.winners[0]).toBe(false); // townsfolk
    expect(ctx.winners[1]).toBe(false); // outsider
    expect(ctx.winners[2]).toBe(true); // minion
    expect(ctx.winners[3]).toBe(true); // demon
  });

  it("respects explicit evil alignment on a townsfolk (aligned evil → selected)", () => {
    const overridePlayer = makePlayer("Alice", "townsfolk", "evil");
    const ctx = makeCtx("evil", [overridePlayer]);
    initWinners.call(ctx);
    expect(ctx.winners[0]).toBe(true);
  });

  it("respects explicit good alignment on a demon (aligned good → not selected)", () => {
    const overridePlayer = makePlayer("Dave", "demon", "good");
    const ctx = makeCtx("evil", [overridePlayer]);
    initWinners.call(ctx);
    expect(ctx.winners[0]).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// toggleWinner
// ─────────────────────────────────────────────────────────────
describe("VictoryModal — toggleWinner", () => {
  it("sets false to true", () => {
    const ctx = makeCtx("good", [makePlayer("Alice", "townsfolk")], [false]);
    toggleWinner.call(ctx, 0);
    expect(ctx.winners[0]).toBe(true);
  });

  it("sets true to false", () => {
    const ctx = makeCtx("good", [makePlayer("Alice", "townsfolk")], [true]);
    toggleWinner.call(ctx, 0);
    expect(ctx.winners[0]).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// close
// ─────────────────────────────────────────────────────────────
describe("VictoryModal — close", () => {
  it("commits setVictoryModalTeam with null", () => {
    const mockCommit = jest.fn();
    close.call({ $store: { commit: mockCommit } });
    expect(mockCommit).toHaveBeenCalledWith(
      "session/setVictoryModalTeam",
      null
    );
  });
});

// ─────────────────────────────────────────────────────────────
// declareVictory
// ─────────────────────────────────────────────────────────────
describe("VictoryModal — declareVictory", () => {
  it("commits declareVictory with the current team", () => {
    const mockCommit = jest.fn();
    declareVictory.call({ team: "good", $store: { commit: mockCommit } });
    expect(mockCommit).toHaveBeenCalledWith("session/declareVictory", "good");
  });

  it("passes the team through correctly for evil", () => {
    const mockCommit = jest.fn();
    declareVictory.call({ team: "evil", $store: { commit: mockCommit } });
    expect(mockCommit).toHaveBeenCalledWith("session/declareVictory", "evil");
  });

  it("closes the modal after declaring so the celebration is visible", () => {
    const mockCommit = jest.fn();
    declareVictory.call({ team: "good", $store: { commit: mockCommit } });
    expect(mockCommit).toHaveBeenCalledWith(
      "session/setVictoryModalTeam",
      null
    );
  });

  it("clears any existing grimoire reveal before declaring", () => {
    const mockCommit = jest.fn();
    declareVictory.call({ team: "good", $store: { commit: mockCommit } });
    expect(mockCommit).toHaveBeenCalledWith("session/clearVictoryReveal");
  });

  it("clears the reveal before declaring (order check)", () => {
    const calls = [];
    const mockCommit = jest.fn(name => calls.push(name));
    declareVictory.call({ team: "good", $store: { commit: mockCommit } });
    expect(calls.indexOf("session/clearVictoryReveal")).toBeLessThan(
      calls.indexOf("session/declareVictory")
    );
  });
});

// ─────────────────────────────────────────────────────────────
// cycleAlignment
// ─────────────────────────────────────────────────────────────
describe("VictoryModal — cycleAlignment", () => {
  const makeAlignCtx = (roleTeam, alignment, victoryTeam = "good") => {
    const player = makePlayer("Alice", roleTeam, alignment);
    const ctx = {
      team: victoryTeam,
      players: [player],
      winners: [false],
      $set(arr, idx, val) {
        arr[idx] = val;
      },
      $store: { commit: jest.fn() }
    };
    return ctx;
  };
  const nextAlignment = ctx => ctx.$store.commit.mock.calls[0][1].value;

  // ── Alignment cycle ───────────────────────────────────────────
  it("townsfolk null → evil (opposite of base team)", () => {
    const ctx = makeAlignCtx("townsfolk", null);
    cycleAlignment.call(ctx, 0);
    expect(nextAlignment(ctx)).toBe("evil");
  });
  it("townsfolk evil → null", () => {
    const ctx = makeAlignCtx("townsfolk", "evil");
    cycleAlignment.call(ctx, 0);
    expect(nextAlignment(ctx)).toBe(null);
  });
  it("outsider null → evil", () => {
    const ctx = makeAlignCtx("outsider", null);
    cycleAlignment.call(ctx, 0);
    expect(nextAlignment(ctx)).toBe("evil");
  });
  it("demon null → good (opposite of base team)", () => {
    const ctx = makeAlignCtx("demon", null);
    cycleAlignment.call(ctx, 0);
    expect(nextAlignment(ctx)).toBe("good");
  });
  it("minion good → null", () => {
    const ctx = makeAlignCtx("minion", "good");
    cycleAlignment.call(ctx, 0);
    expect(nextAlignment(ctx)).toBe(null);
  });
  it("traveler null → good", () => {
    const ctx = makeAlignCtx("traveler", null);
    cycleAlignment.call(ctx, 0);
    expect(nextAlignment(ctx)).toBe("good");
  });
  it("traveler good → evil", () => {
    const ctx = makeAlignCtx("traveler", "good");
    cycleAlignment.call(ctx, 0);
    expect(nextAlignment(ctx)).toBe("evil");
  });
  it("traveler evil → null", () => {
    const ctx = makeAlignCtx("traveler", "evil");
    cycleAlignment.call(ctx, 0);
    expect(nextAlignment(ctx)).toBe(null);
  });

  // ── Auto-winner update (good victory) ────────────────────────
  it("demon toggled to good → auto-included in good victory", () => {
    const ctx = makeAlignCtx("demon", null, "good");
    cycleAlignment.call(ctx, 0); // null → good
    expect(ctx.winners[0]).toBe(true);
  });
  it("townsfolk toggled to evil → auto-excluded from good victory", () => {
    const ctx = makeAlignCtx("townsfolk", null, "good");
    cycleAlignment.call(ctx, 0); // null → evil
    expect(ctx.winners[0]).toBe(false);
  });
  it("townsfolk toggled back to null → re-included in good victory by role", () => {
    const ctx = makeAlignCtx("townsfolk", "evil", "good");
    cycleAlignment.call(ctx, 0); // evil → null
    expect(ctx.winners[0]).toBe(true);
  });
  it("demon toggled back to null → re-excluded from good victory by role", () => {
    const ctx = makeAlignCtx("demon", "good", "good");
    cycleAlignment.call(ctx, 0); // good → null
    expect(ctx.winners[0]).toBe(false);
  });

  // ── Auto-winner update (evil victory) ────────────────────────
  it("townsfolk toggled to evil → auto-included in evil victory", () => {
    const ctx = makeAlignCtx("townsfolk", null, "evil");
    cycleAlignment.call(ctx, 0); // null → evil
    expect(ctx.winners[0]).toBe(true);
  });
  it("demon toggled to good → auto-excluded from evil victory", () => {
    const ctx = makeAlignCtx("demon", null, "evil");
    cycleAlignment.call(ctx, 0); // null → good
    expect(ctx.winners[0]).toBe(false);
  });

  // ── No role edge case ─────────────────────────────────────────
  it("player with no role is never auto-included", () => {
    const player = {
      name: "X",
      isDead: false,
      alignment: null,
      pronouns: "",
      role: {}
    };
    const ctx = {
      team: "good",
      players: [player],
      winners: [true],
      $set(arr, idx, val) {
        arr[idx] = val;
      },
      $store: { commit: jest.fn() }
    };
    cycleAlignment.call(ctx, 0);
    expect(ctx.winners[0]).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// revealGrimoire
// ─────────────────────────────────────────────────────────────
describe("VictoryModal — revealGrimoire", () => {
  const players = [
    makePlayer("Alice", "townsfolk"),
    makePlayer("Bob", "demon")
  ];
  // Test players have no reminders, so trueRoleFor always returns null
  const trueRoleFor = () => null;
  // playerTrueRoles is a computed derived from trueRoleFor — mirror that here
  const makeCtx = overrides => ({
    trueRoleFor,
    get playerTrueRoles() {
      return this.players.map(p => this.trueRoleFor(p));
    },
    effectiveAlignment(p) {
      if (p.alignment) return p.alignment;
      if (!p.role || !p.role.team) return null;
      if (["townsfolk", "outsider"].includes(p.role.team)) return "good";
      if (["minion", "demon"].includes(p.role.team)) return "evil";
      return null;
    },
    ...overrides
  });

  it("is a no-op when no winners are selected", () => {
    const mockCommit = jest.fn();
    const ctx = makeCtx({
      selectedCount: 0,
      team: "good",
      players,
      winners: [false, false],
      $store: { commit: mockCommit },
      close: jest.fn()
    });
    revealGrimoire.call(ctx);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("commits setVictoryReveal with the correct snapshot", () => {
    const mockCommit = jest.fn();
    const ctx = makeCtx({
      selectedCount: 1,
      team: "good",
      players,
      winners: [true, false],
      $store: { commit: mockCommit },
      close: jest.fn()
    });
    revealGrimoire.call(ctx);
    const [mutName, payload] = mockCommit.mock.calls[0];
    expect(mutName).toBe("session/setVictoryReveal");
    expect(payload.winningTeam).toBe("good");
    expect(payload.winners).toEqual([0]);
    expect(payload.players).toHaveLength(2);
    expect(payload.players[0].name).toBe("Alice");
  });

  it("snapshot player includes only the required fields", () => {
    const mockCommit = jest.fn();
    const ctx = makeCtx({
      selectedCount: 1,
      team: "evil",
      players,
      winners: [false, true],
      $store: { commit: mockCommit },
      close: jest.fn()
    });
    revealGrimoire.call(ctx);
    const payload = mockCommit.mock.calls[0][1];
    const snap = payload.players[1]; // Bob the demon
    expect(snap).toHaveProperty("name");
    expect(snap).toHaveProperty("role");
    expect(snap).toHaveProperty("alignment");
    expect(snap).toHaveProperty("isDead");
    // Should NOT include reminders, socket id, or raw player fields like pronouns
    expect(snap).not.toHaveProperty("pronouns");
    expect(snap).not.toHaveProperty("reminders");
    expect(snap).not.toHaveProperty("id");
  });

  it("calls close after committing", () => {
    const mockClose = jest.fn();
    const ctx = makeCtx({
      selectedCount: 1,
      team: "good",
      players,
      winners: [true, false],
      $store: { commit: jest.fn() },
      close: mockClose
    });
    revealGrimoire.call(ctx);
    expect(mockClose).toHaveBeenCalled();
  });

  it("builds winners array from selected indices only", () => {
    const mockCommit = jest.fn();
    const ctx = makeCtx({
      selectedCount: 2,
      team: "evil",
      players: [
        makePlayer("A", "townsfolk"),
        makePlayer("B", "minion"),
        makePlayer("C", "demon")
      ],
      winners: [false, true, true],
      $store: { commit: mockCommit },
      close: jest.fn()
    });
    revealGrimoire.call(ctx);
    expect(mockCommit.mock.calls[0][1].winners).toEqual([1, 2]);
  });

  it("snapshot includes a revealOrder covering all player indices", () => {
    const mockCommit = jest.fn();
    const ctx = makeCtx({
      selectedCount: 1,
      team: "evil",
      players,
      winners: [false, true],
      $store: { commit: mockCommit },
      close: jest.fn()
    });
    revealGrimoire.call(ctx);
    const { revealOrder } = mockCommit.mock.calls[0][1];
    expect(revealOrder).toHaveLength(players.length);
    expect([...revealOrder].sort((a, b) => a - b)).toEqual(
      players.map((_, i) => i)
    );
  });

  it("evil victory: revealOrder places an evil player last", () => {
    const mockCommit = jest.fn();
    const ctx = makeCtx({
      selectedCount: 1,
      team: "evil",
      players,
      winners: [false, true],
      $store: { commit: mockCommit },
      close: jest.fn()
    });
    revealGrimoire.call(ctx);
    const { revealOrder, players: snap } = mockCommit.mock.calls[0][1];
    const last = snap[revealOrder[revealOrder.length - 1]];
    expect(["minion", "demon"]).toContain(last.role.team);
  });

  it("good victory: revealOrder places a good player last", () => {
    const mockCommit = jest.fn();
    const ctx = makeCtx({
      selectedCount: 1,
      team: "good",
      players,
      winners: [true, false],
      $store: { commit: mockCommit },
      close: jest.fn()
    });
    revealGrimoire.call(ctx);
    const { revealOrder, players: snap } = mockCommit.mock.calls[0][1];
    const last = snap[revealOrder[revealOrder.length - 1]];
    expect(["townsfolk", "outsider"]).toContain(last.role.team);
  });
});
