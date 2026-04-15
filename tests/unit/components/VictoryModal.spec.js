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
  const makeCtx = ({ $store: storeOverride, ...overrides } = {}) => ({
    trueRoleFor,
    _serializeRole: VictoryModal.methods._serializeRole,
    buildRevealOrder: VictoryModal.methods.buildRevealOrder,
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
    $store: {
      state: { players: { bluffs: [], fabled: [] } },
      commit: jest.fn(),
      ...storeOverride
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
    // revealOrder + finalPair together must account for every player
    const { revealOrder, finalPair } = mockCommit.mock.calls[0][1];
    const allIndices = [...revealOrder, ...(finalPair || [])];
    expect(allIndices).toHaveLength(players.length);
    expect([...allIndices].sort((a, b) => a - b)).toEqual(
      players.map((_, i) => i)
    );
  });

  it("evil victory: revealOrder places an evil player last (Rule 2 fallback)", () => {
    // 2 alive but no alive demon → Rule 1b fallthrough → Rule 2
    const mockCommit = jest.fn();
    const ctx = makeCtx({
      selectedCount: 1,
      team: "evil",
      players: [
        makePlayer("Alice", "townsfolk"),
        makePlayer("Bob", "minion"),
        makePlayer("Carol", "demon", null, true) // dead demon, no Rule 1b
      ],
      winners: [false, true, false],
      $store: { commit: mockCommit },
      close: jest.fn()
    });
    revealGrimoire.call(ctx);
    const { revealOrder, players: snap } = mockCommit.mock.calls[0][1];
    const last = snap[revealOrder[revealOrder.length - 1]];
    expect(["minion", "demon"]).toContain(last.role.team);
  });

  it("good victory: revealOrder places a good player last (Rule 2 fallback)", () => {
    // 1 alive good player, demon is dead → no alive evil → Rule 2
    const mockCommit = jest.fn();
    const ctx = makeCtx({
      selectedCount: 1,
      team: "good",
      players: [
        makePlayer("Alice", "townsfolk"),
        makePlayer("Bob", "demon", null, true) // dead
      ],
      winners: [true, false],
      $store: { commit: mockCommit },
      close: jest.fn()
    });
    revealGrimoire.call(ctx);
    const { revealOrder, players: snap } = mockCommit.mock.calls[0][1];
    const last = snap[revealOrder[revealOrder.length - 1]];
    expect(["townsfolk", "outsider"]).toContain(last.role.team);
  });

  it("revealOrder places all dead players before all alive players (dead-first ordering)", () => {
    // Rule 2 scenario: 1 alive good, 1 dead minion, 1 dead demon → no finalPair
    const mockCommit = jest.fn();
    const deadMinion = makePlayer("Alice", "minion", null, true); // idx 0, dead
    const aliveTownsfolk = makePlayer("Bob", "townsfolk", null, false); // idx 1, alive
    const deadDemon = makePlayer("Carol", "demon", null, true); // idx 2, dead
    const ctx = makeCtx({
      selectedCount: 1,
      team: "good",
      players: [deadMinion, aliveTownsfolk, deadDemon],
      winners: [false, true, false],
      $store: { commit: mockCommit },
      close: jest.fn()
    });
    revealGrimoire.call(ctx);
    const { revealOrder, players: snap } = mockCommit.mock.calls[0][1];
    // Collect isDead flags in reveal order
    const deadFlags = revealOrder.map(i => snap[i].isDead);
    // All trues must come before all falses
    const firstAliveIdx = deadFlags.indexOf(false);
    const lastDeadIdx = deadFlags.lastIndexOf(true);
    if (firstAliveIdx !== -1 && lastDeadIdx !== -1) {
      expect(lastDeadIdx).toBeLessThan(firstAliveIdx);
    }
  });

  // ── Rule 1a — Good Victory FinalPair & Sequential tail ───────
  describe("Rule 1a — good victory finalPair & sequential tail", () => {
    // Sub-case A players: 1 alive evil + 1 alive good → finalPair (any game size)
    const subCaseAPlayers = [
      makePlayer("Alice", "townsfolk", null, false), // idx 0, alive good
      makePlayer("Bob", "minion", null, false), // idx 1, alive evil
      makePlayer("Carol", "demon", null, true) // idx 2, dead evil demon
    ];

    // Sub-case B: both alive are good → sequential tail
    const subCaseBPlayers = [
      makePlayer("Alice", "townsfolk", null, false), // idx 0, alive good
      makePlayer("Bob", "outsider", null, false), // idx 1, alive good
      makePlayer("Carol", "demon", null, true) // idx 2, dead evil demon
    ];

    // ── Sub-case A (1 evil + 1 good alive) ─────────────────
    it("Sub-case A: finalThree=true when 1 alive evil + 1 alive good", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "good",
        players: subCaseAPlayers,
        winners: [true, false, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      expect(mockCommit.mock.calls[0][1].finalThree).toBe(true);
    });

    it("Sub-case A: finalPair contains the alive evil and alive good players", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "good",
        players: subCaseAPlayers,
        winners: [true, false, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const { finalPair, players: snap } = mockCommit.mock.calls[0][1];
      expect(finalPair).toHaveLength(2);
      const pairPlayers = finalPair.map(i => snap[i]);
      expect(
        pairPlayers.some(
          p => !p.isDead && ["minion", "demon"].includes(p.role.team)
        )
      ).toBe(true);
      expect(
        pairPlayers.some(
          p => !p.isDead && ["townsfolk", "outsider"].includes(p.role.team)
        )
      ).toBe(true);
    });

    it("Sub-case A: dead demon is last in revealOrder", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "good",
        players: subCaseAPlayers,
        winners: [true, false, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const { revealOrder, players: snap } = mockCommit.mock.calls[0][1];
      const last = snap[revealOrder[revealOrder.length - 1]];
      expect(last.isDead).toBe(true);
      expect(last.role.team).toBe("demon");
    });

    it("Sub-case A: revealOrder + finalPair covers all players", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "good",
        players: subCaseAPlayers,
        winners: [true, false, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const { revealOrder, finalPair } = mockCommit.mock.calls[0][1];
      const all = [...revealOrder, ...finalPair].sort((a, b) => a - b);
      expect(all).toEqual(subCaseAPlayers.map((_, i) => i));
    });

    it("Rule 1a fires for 3+ alive games when alive evil + alive good exist", () => {
      const mockCommit = jest.fn();
      // 4 players: 2 alive good, 1 alive evil, 1 dead → Rule 1a fires
      const ctx = makeCtx({
        selectedCount: 2,
        team: "good",
        players: [
          makePlayer("Alice", "townsfolk", null, false), // alive good
          makePlayer("Bob", "outsider", null, false), // alive good
          makePlayer("Carol", "minion", null, false), // alive evil
          makePlayer("Dave", "demon", null, true) // dead
        ],
        winners: [true, true, false, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const payload = mockCommit.mock.calls[0][1];
      expect(payload.finalThree).toBe(true);
      expect(payload.finalPair).toHaveLength(2);
      const pairPlayers = payload.finalPair.map(i => payload.players[i]);
      expect(
        pairPlayers.some(
          p => !p.isDead && ["minion", "demon"].includes(p.role.team)
        )
      ).toBe(true);
      expect(
        pairPlayers.some(
          p => !p.isDead && ["townsfolk", "outsider"].includes(p.role.team)
        )
      ).toBe(true);
    });

    // ── Sub-case B (both alive are good) ───────────────────
    it("Sub-case B: finalThree=false and finalPair=[] when both alive are good", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 2,
        team: "good",
        players: subCaseBPlayers,
        winners: [true, true, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const payload = mockCommit.mock.calls[0][1];
      expect(payload.finalThree).toBe(false);
      expect(payload.finalPair).toHaveLength(0);
    });

    it("Sub-case B: all players are in revealOrder", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 2,
        team: "good",
        players: subCaseBPlayers,
        winners: [true, true, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const { revealOrder } = mockCommit.mock.calls[0][1];
      expect(revealOrder).toHaveLength(subCaseBPlayers.length);
      expect([...revealOrder].sort((a, b) => a - b)).toEqual(
        subCaseBPlayers.map((_, i) => i)
      );
    });

    it("Sub-case B: dead demon is third-to-last in revealOrder", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 2,
        team: "good",
        players: subCaseBPlayers,
        winners: [true, true, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const { revealOrder, players: snap } = mockCommit.mock.calls[0][1];
      const thirdToLast = snap[revealOrder[revealOrder.length - 3]];
      expect(thirdToLast.isDead).toBe(true);
      expect(thirdToLast.role.team).toBe("demon");
    });

    it("Sub-case B: last two in revealOrder are the alive good players", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 2,
        team: "good",
        players: subCaseBPlayers,
        winners: [true, true, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const { revealOrder, players: snap } = mockCommit.mock.calls[0][1];
      const secondToLast = snap[revealOrder[revealOrder.length - 2]];
      const last = snap[revealOrder[revealOrder.length - 1]];
      expect(secondToLast.isDead).toBe(false);
      expect(["townsfolk", "outsider"]).toContain(secondToLast.role.team);
      expect(last.isDead).toBe(false);
      expect(["townsfolk", "outsider"]).toContain(last.role.team);
    });

    // ── Fallthrough ─────────────────────────────────────────
    it("Rule 1a does not fire when dead demon is good-aligned (falls through to Rule 2)", () => {
      const mockCommit = jest.fn();
      const goodDemonPlayers = [
        makePlayer("Alice", "townsfolk", null, false),
        makePlayer("Bob", "townsfolk", null, false),
        makePlayer("Carol", "demon", "good", true) // dead demon but good-aligned
      ];
      const ctx = makeCtx({
        selectedCount: 2,
        team: "good",
        players: goodDemonPlayers,
        winners: [true, true, true],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const {
        revealOrder,
        finalPair,
        finalThree
      } = mockCommit.mock.calls[0][1];
      expect(finalThree).toBe(false);
      expect(finalPair).toHaveLength(0);
      expect(revealOrder).toHaveLength(goodDemonPlayers.length);
    });
  });

  // ── Rule 1b — Final 3, Evil Victory (exactly 2 alive) ───────
  describe("Final 3 special reveal", () => {
    it("sets finalThree=true for evil win when exactly 2 alive including a demon", () => {
      const mockCommit = jest.fn();
      const players = [
        makePlayer("Alice", "townsfolk", null, true), // dead
        makePlayer("Bob", "minion", null, false), // alive evil
        makePlayer("Carol", "demon", null, false) // alive demon
      ];
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players,
        winners: [false, true, true],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const payload = mockCommit.mock.calls[0][1];
      expect(payload.finalThree).toBe(true);
    });

    it("finalPair contains the alive demon for evil win", () => {
      const mockCommit = jest.fn();
      const players = [
        makePlayer("Alice", "townsfolk", null, true), // dead
        makePlayer("Bob", "minion", null, false), // alive evil
        makePlayer("Carol", "demon", null, false) // alive demon idx 2
      ];
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players,
        winners: [false, true, true],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const { finalPair, players: snap } = mockCommit.mock.calls[0][1];
      const pairPlayers = finalPair.map(i => snap[i]);
      const hasDemon = pairPlayers.some(p => p.role.team === "demon");
      expect(hasDemon).toBe(true);
      expect(pairPlayers.every(p => !p.isDead)).toBe(true);
    });

    it("finalThree=false when 3 or more players are alive", () => {
      const mockCommit = jest.fn();
      // 3 alive → livingCount=3, Final 3 does not trigger
      const players = [
        makePlayer("Alice", "townsfolk", null, false),
        makePlayer("Bob", "townsfolk", null, false),
        makePlayer("Charlie", "outsider", null, false), // 3rd alive
        makePlayer("Carol", "demon", null, true) // dead demon
      ];
      const ctx = makeCtx({
        selectedCount: 3,
        team: "good",
        players,
        winners: [true, true, true, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      expect(mockCommit.mock.calls[0][1].finalThree).toBe(false);
    });

    it("finalThree=false for good win when no dead evil demon exists", () => {
      const mockCommit = jest.fn();
      // Only 2 alive but no dead demon — Final 3 cannot fire
      const players = [
        makePlayer("Alice", "townsfolk", null, false), // alive
        makePlayer("Bob", "minion", null, true), // dead non-demon
        makePlayer("Carol", "townsfolk", null, true) // dead
      ];
      const ctx = makeCtx({
        selectedCount: 1,
        team: "good",
        players,
        winners: [true, false, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      expect(mockCommit.mock.calls[0][1].finalThree).toBe(false);
      expect(mockCommit.mock.calls[0][1].finalPair).toHaveLength(0);
    });
  });

  // ── Rule 1c — Evil Win, >2 Alive, Alive Evil Demon ───────
  describe("Rule 1c — evil victory, unusual (>2 alive, alive evil demon)", () => {
    it("finalPair = [demon, alive good] when alive good exists", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players: [
          makePlayer("Alice", "townsfolk", null, false), // alive good
          makePlayer("Bob", "outsider", null, false), // alive good
          makePlayer("Carol", "demon", null, false), // alive evil demon
          makePlayer("Dave", "minion", null, false) // alive evil
        ],
        winners: [false, false, true, true],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const {
        finalThree,
        finalPair,
        players: snap
      } = mockCommit.mock.calls[0][1];
      expect(finalThree).toBe(true);
      expect(finalPair).toHaveLength(2);
      const pairPlayers = finalPair.map(i => snap[i]);
      expect(pairPlayers.some(p => p.role.team === "demon" && !p.isDead)).toBe(
        true
      );
      expect(
        pairPlayers.some(p => ["townsfolk", "outsider"].includes(p.role.team))
      ).toBe(true);
    });

    it("demon placed last in revealOrder when only alive non-evil is a traveler", () => {
      // A traveler (null alignment) keeps hasAliveNonEvil=true so the all-evil
      // path does not fire, and Rule 1c's demon-last sub-case applies.
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players: [
          makePlayer("Alice", "traveler", null, false), // alive, null alignment
          makePlayer("Bob", "minion", null, false), // alive evil
          makePlayer("Carol", "demon", null, false) // alive evil demon
        ],
        winners: [false, true, true],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const {
        finalThree,
        finalPair,
        revealOrder,
        players: snap
      } = mockCommit.mock.calls[0][1];
      expect(finalThree).toBe(false);
      expect(finalPair).toHaveLength(0);
      const last = snap[revealOrder[revealOrder.length - 1]];
      expect(last.role.team).toBe("demon");
      expect(last.isDead).toBe(false);
    });

    it("revealOrder + finalPair covers all players (alive good case)", () => {
      const mockCommit = jest.fn();
      const players = [
        makePlayer("Alice", "townsfolk", null, false),
        makePlayer("Bob", "minion", null, false),
        makePlayer("Carol", "demon", null, false)
      ];
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players,
        winners: [false, true, true],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const { revealOrder, finalPair } = mockCommit.mock.calls[0][1];
      const all = [...revealOrder, ...finalPair].sort((a, b) => a - b);
      expect(all).toEqual(players.map((_, i) => i));
    });
  });

  // ── Rule 1d — Evil Win, >2 Alive, Dead Demon ─────────────
  describe("Rule 1d — evil victory, unusual (>2 alive, dead demon)", () => {
    it("finalPair = [alive evil, alive good] when both exist", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players: [
          makePlayer("Alice", "townsfolk", null, false), // alive good
          makePlayer("Bob", "minion", null, false), // alive evil
          makePlayer("Carol", "minion", null, false), // alive evil
          makePlayer("Dave", "demon", null, true) // dead demon
        ],
        winners: [false, true, true, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const {
        finalThree,
        finalPair,
        players: snap
      } = mockCommit.mock.calls[0][1];
      expect(finalThree).toBe(true);
      expect(finalPair).toHaveLength(2);
      const pairPlayers = finalPair.map(i => snap[i]);
      expect(
        pairPlayers.some(
          p => ["minion", "demon"].includes(p.role.team) && !p.isDead
        )
      ).toBe(true);
      expect(
        pairPlayers.some(
          p => ["townsfolk", "outsider"].includes(p.role.team) && !p.isDead
        )
      ).toBe(true);
    });

    it("finalPair = [alive evil 1, alive evil 2] when alive non-evil is only a traveler", () => {
      // A traveler (null alignment) keeps hasAliveNonEvil=true so the all-evil
      // path does not fire, and Rule 1d's two-evil fallback applies.
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players: [
          makePlayer("Alice", "traveler", null, false), // alive, null alignment
          makePlayer("Bob", "minion", null, false), // alive evil
          makePlayer("Carol", "minion", null, false), // alive evil
          makePlayer("Dave", "demon", null, true) // dead demon
        ],
        winners: [false, true, true, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const {
        finalThree,
        finalPair,
        players: snap
      } = mockCommit.mock.calls[0][1];
      expect(finalThree).toBe(true);
      expect(finalPair).toHaveLength(2);
      const pairPlayers = finalPair.map(i => snap[i]);
      expect(
        pairPlayers.every(
          p => ["minion", "demon"].includes(p.role.team) && !p.isDead
        )
      ).toBe(true);
    });

    it("falls through to Rule 2 when only 1 alive evil and no alive good (no traveler)", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players: [
          makePlayer("Alice", "minion", null, false), // sole alive evil
          makePlayer("Bob", "townsfolk", null, true), // dead good
          makePlayer("Carol", "outsider", null, true), // dead good
          makePlayer("Dave", "demon", null, true) // dead demon
        ],
        winners: [true, false, false, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const {
        finalThree,
        finalPair,
        revealOrder
      } = mockCommit.mock.calls[0][1];
      expect(finalThree).toBe(false);
      expect(finalPair).toHaveLength(0);
      expect(revealOrder).toHaveLength(4); // all players in revealOrder
    });
  });

  // ── Overwhelming Evil Victory (all alive are evil) ──────────
  describe("Overwhelming evil victory — all alive players are evil", () => {
    // 3 alive minions + dead townsfolk — all alive are evil
    const allEvilPlayers = [
      makePlayer("Alice", "minion", null, false), // idx 0, alive evil
      makePlayer("Bob", "minion", null, false), // idx 1, alive evil
      makePlayer("Carol", "demon", null, false), // idx 2, alive evil demon
      makePlayer("Dave", "townsfolk", null, true) // idx 3, dead good
    ];

    it("finalThree=true when all 3+ alive players are evil", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players: allEvilPlayers,
        winners: [true, true, true, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      expect(mockCommit.mock.calls[0][1].finalThree).toBe(true);
    });

    it("finalPair contains every alive player", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players: allEvilPlayers,
        winners: [true, true, true, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const { finalPair, players: snap } = mockCommit.mock.calls[0][1];
      expect(finalPair).toHaveLength(3);
      expect(finalPair.every(i => !snap[i].isDead)).toBe(true);
    });

    it("revealOrder contains only dead players", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players: allEvilPlayers,
        winners: [true, true, true, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const { revealOrder, players: snap } = mockCommit.mock.calls[0][1];
      expect(revealOrder.every(i => snap[i].isDead)).toBe(true);
    });

    it("revealOrder + finalPair covers all players", () => {
      const mockCommit = jest.fn();
      const ctx = makeCtx({
        selectedCount: 1,
        team: "evil",
        players: allEvilPlayers,
        winners: [true, true, true, false],
        $store: { commit: mockCommit },
        close: jest.fn()
      });
      revealGrimoire.call(ctx);
      const { revealOrder, finalPair } = mockCommit.mock.calls[0][1];
      const all = [...revealOrder, ...finalPair].sort((a, b) => a - b);
      expect(all).toEqual(allEvilPlayers.map((_, i) => i));
    });
  });
});
