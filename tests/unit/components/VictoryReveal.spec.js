import VictoryReveal from "@/components/VictoryReveal.vue";

const {
  startReveal,
  dismiss,
  isWinner,
  playerPosition
} = VictoryReveal.methods;
const { allRevealed } = VictoryReveal.computed;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const makeCtx = (
  playerCount = 5,
  winners = [],
  isSpectator = true,
  winningTeam = "evil"
) => ({
  dismissed: false,
  revealedIndices: [],
  revealOrder: [],
  revealIdx: 0,
  phase1Timer: null,
  phase2Interval: null,
  snapshotPlayers: Array.from({ length: playerCount }, (_, i) => ({
    name: `Player ${i}`,
    role: { team: "townsfolk" },
    alignment: null,
    isDead: false
  })),
  snapshotWinners: winners,
  winningTeam,
  session: { isSpectator },
  $store: { commit: jest.fn() },
  effectiveAlignment: VictoryReveal.methods.effectiveAlignment
});

// Players with explicit good/evil for reveal-order tests
const makeMixedCtx = (winningTeam = "evil") => ({
  dismissed: false,
  revealedIndices: [],
  revealOrder: [],
  revealIdx: 0,
  phase1Timer: null,
  phase2Interval: null,
  snapshotPlayers: [
    {
      name: "Alice",
      role: { team: "townsfolk" },
      alignment: null,
      isDead: false
    }, // good
    { name: "Bob", role: { team: "minion" }, alignment: null, isDead: false }, // evil
    {
      name: "Carol",
      role: { team: "outsider" },
      alignment: null,
      isDead: false
    }, // good
    { name: "Dave", role: { team: "demon" }, alignment: null, isDead: false }, // evil
    { name: "Eve", role: { team: "townsfolk" }, alignment: null, isDead: false } // good
  ],
  snapshotWinners: [],
  winningTeam,
  session: { isSpectator: true },
  $store: { commit: jest.fn() },
  effectiveAlignment: VictoryReveal.methods.effectiveAlignment
});

// ─────────────────────────────────────────────────────────────
// startReveal
// ─────────────────────────────────────────────────────────────
describe("VictoryReveal — startReveal", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("resets dismissed to false on re-trigger", () => {
    const ctx = makeCtx(3);
    ctx.dismissed = true;
    startReveal.call(ctx);
    expect(ctx.dismissed).toBe(false);
  });

  it("clears revealedIndices at the start", () => {
    const ctx = makeCtx(3);
    ctx.revealedIndices = [0, 1];
    startReveal.call(ctx);
    expect(ctx.revealedIndices).toHaveLength(0);
  });

  it("builds a revealOrder with the correct length", () => {
    const ctx = makeCtx(5);
    startReveal.call(ctx);
    expect(ctx.revealOrder).toHaveLength(5);
  });

  it("revealOrder contains all player indices (shuffle check)", () => {
    const ctx = makeCtx(4);
    startReveal.call(ctx);
    expect(ctx.revealOrder.sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it("no tokens revealed during Phase 1 (0ms)", () => {
    const ctx = makeCtx(3);
    startReveal.call(ctx);
    // No time elapsed — still blank
    expect(ctx.revealedIndices).toHaveLength(0);
  });

  it("no tokens revealed at 999ms (Phase 1 still running)", () => {
    const ctx = makeCtx(3);
    startReveal.call(ctx);
    jest.advanceTimersByTime(999);
    expect(ctx.revealedIndices).toHaveLength(0);
  });

  it("Phase 2 begins after 1000ms — first token revealed", () => {
    const ctx = makeCtx(3);
    startReveal.call(ctx);
    jest.advanceTimersByTime(1700); // 1000ms + 1 tick of 540ms
    expect(ctx.revealedIndices).toHaveLength(1);
  });

  it("all tokens revealed after Phase 1 + n × 450ms", () => {
    const n = 4;
    const ctx = makeCtx(n);
    startReveal.call(ctx);
    // 1000ms Phase 1 + n * 700ms to reveal all
    jest.advanceTimersByTime(1000 + n * 700);
    expect(ctx.revealedIndices).toHaveLength(n);
  });

  it("each revealed index is within bounds", () => {
    const n = 5;
    const ctx = makeCtx(n);
    startReveal.call(ctx);
    jest.advanceTimersByTime(1000 + n * 700);
    ctx.revealedIndices.forEach(idx => {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(n);
    });
  });

  it("no duplicate indices after full reveal", () => {
    const n = 5;
    const ctx = makeCtx(n);
    startReveal.call(ctx);
    jest.advanceTimersByTime(1000 + n * 700);
    const unique = new Set(ctx.revealedIndices);
    expect(unique.size).toBe(n);
  });

  it("re-calling startReveal resets and replays from Phase 1", () => {
    const ctx = makeCtx(3);
    // First call — advance exactly 1 tick into Phase 2 (1000ms + 1×450ms)
    startReveal.call(ctx);
    jest.advanceTimersByTime(1700); // 1000ms Phase1 + 540ms = 1 token revealed
    expect(ctx.revealedIndices).toHaveLength(1);

    // Second call — should reset
    startReveal.call(ctx);
    expect(ctx.revealedIndices).toHaveLength(0);
    // Phase 1 again — no reveals immediately
    jest.advanceTimersByTime(999);
    expect(ctx.revealedIndices).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// reveal order — featured player logic
// ─────────────────────────────────────────────────────────────
describe("VictoryReveal — reveal order (featured players)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("uses revealOrder from the snapshot when provided", () => {
    const ctx = makeMixedCtx("evil");
    const fixedOrder = [4, 2, 0, 1, 3]; // deterministic
    ctx.session = {
      isSpectator: true,
      victoryRevealSnapshot: { revealOrder: fixedOrder }
    };
    startReveal.call(ctx);
    expect(ctx.revealOrder).toEqual(fixedOrder);
  });

  it("does not mutate the snapshot revealOrder array", () => {
    const ctx = makeMixedCtx("evil");
    const fixedOrder = [4, 2, 0, 1, 3];
    ctx.session = {
      isSpectator: true,
      victoryRevealSnapshot: { revealOrder: fixedOrder }
    };
    startReveal.call(ctx);
    expect(fixedOrder).toEqual([4, 2, 0, 1, 3]); // original unchanged
  });

  it("falls back to local generation when snapshot has no revealOrder", () => {
    const ctx = makeMixedCtx("evil");
    // session.victoryRevealSnapshot is absent in default makeMixedCtx
    startReveal.call(ctx);
    expect(ctx.revealOrder).toHaveLength(ctx.snapshotPlayers.length);
  });

  it("evil victory: evil player is revealed very last", () => {
    const ctx = makeMixedCtx("evil");
    startReveal.call(ctx);
    const last = ctx.revealOrder[ctx.revealOrder.length - 1];
    expect(ctx.effectiveAlignment(ctx.snapshotPlayers[last])).toBe("evil");
  });

  it("evil victory: good player is second-to-last", () => {
    const ctx = makeMixedCtx("evil");
    startReveal.call(ctx);
    const secondLast = ctx.revealOrder[ctx.revealOrder.length - 2];
    expect(ctx.effectiveAlignment(ctx.snapshotPlayers[secondLast])).toBe(
      "good"
    );
  });

  it("good victory: good player is revealed very last", () => {
    const ctx = makeMixedCtx("good");
    startReveal.call(ctx);
    const last = ctx.revealOrder[ctx.revealOrder.length - 1];
    expect(ctx.effectiveAlignment(ctx.snapshotPlayers[last])).toBe("good");
  });

  it("good victory: evil player is second-to-last", () => {
    const ctx = makeMixedCtx("good");
    startReveal.call(ctx);
    const secondLast = ctx.revealOrder[ctx.revealOrder.length - 2];
    expect(ctx.effectiveAlignment(ctx.snapshotPlayers[secondLast])).toBe(
      "evil"
    );
  });

  it("reveal order still contains all player indices", () => {
    const ctx = makeMixedCtx("evil");
    startReveal.call(ctx);
    expect(ctx.revealOrder.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("no duplicates in reveal order with mixed alignments", () => {
    const ctx = makeMixedCtx("evil");
    startReveal.call(ctx);
    expect(new Set(ctx.revealOrder).size).toBe(ctx.snapshotPlayers.length);
  });

  it("prefers a living evil player over a dead one for the final slot", () => {
    // index 1 (Bob, evil) is dead; index 3 (Dave, evil) is alive
    const ctx = makeMixedCtx("evil");
    ctx.snapshotPlayers[1].isDead = true; // Bob dead
    ctx.snapshotPlayers[3].isDead = false; // Dave alive
    startReveal.call(ctx);
    const last = ctx.revealOrder[ctx.revealOrder.length - 1];
    expect(last).toBe(3); // Dave (living evil) should be chosen
  });

  it("falls back to dead evil player when no living evil player exists", () => {
    const ctx = makeMixedCtx("evil");
    ctx.snapshotPlayers[1].isDead = true;
    ctx.snapshotPlayers[3].isDead = true;
    startReveal.call(ctx);
    const last = ctx.revealOrder[ctx.revealOrder.length - 1];
    expect(ctx.effectiveAlignment(ctx.snapshotPlayers[last])).toBe("evil");
  });

  it("prefers a living good player over a dead one for the final slot (good victory)", () => {
    // index 0 (Alice, good) is dead; index 2 (Carol, good) and index 4 (Eve, good) alive
    const ctx = makeMixedCtx("good");
    ctx.snapshotPlayers[0].isDead = true;
    startReveal.call(ctx);
    const last = ctx.revealOrder[ctx.revealOrder.length - 1];
    expect(ctx.snapshotPlayers[last].isDead).toBe(false);
    expect(ctx.effectiveAlignment(ctx.snapshotPlayers[last])).toBe("good");
  });
});

// ─────────────────────────────────────────────────────────────
// allRevealed computed
// ─────────────────────────────────────────────────────────────
describe("VictoryReveal — allRevealed", () => {
  it("is false when no tokens are revealed", () => {
    const ctx = { revealedIndices: [], snapshotPlayers: [{}, {}, {}] };
    expect(allRevealed.call(ctx)).toBe(false);
  });

  it("is false when partially revealed", () => {
    const ctx = { revealedIndices: [0, 1], snapshotPlayers: [{}, {}, {}] };
    expect(allRevealed.call(ctx)).toBe(false);
  });

  it("is true when all tokens are revealed", () => {
    const ctx = { revealedIndices: [0, 1, 2], snapshotPlayers: [{}, {}, {}] };
    expect(allRevealed.call(ctx)).toBe(true);
  });

  it("is false when snapshot is empty (no players)", () => {
    const ctx = { revealedIndices: [], snapshotPlayers: [] };
    expect(allRevealed.call(ctx)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// dismiss
// ─────────────────────────────────────────────────────────────
describe("VictoryReveal — dismiss", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("sets dismissed to true", () => {
    const ctx = makeCtx(3);
    dismiss.call(ctx);
    expect(ctx.dismissed).toBe(true);
  });

  it("cancels phase1Timer", () => {
    const ctx = makeCtx(3);
    startReveal.call(ctx); // sets phase1Timer
    dismiss.call(ctx);
    // Advancing past Phase 1 should not trigger any reveals
    jest.advanceTimersByTime(2000);
    expect(ctx.revealedIndices).toHaveLength(0);
  });

  it("stops ongoing Phase 2 reveals when dismissed mid-reveal", () => {
    const ctx = makeCtx(5);
    startReveal.call(ctx);
    jest.advanceTimersByTime(1450); // 1 token revealed
    const countBeforeDismiss = ctx.revealedIndices.length;
    dismiss.call(ctx);
    jest.advanceTimersByTime(2000); // no further reveals
    expect(ctx.revealedIndices.length).toBe(countBeforeDismiss);
  });

  it("spectator dismiss does NOT commit clearVictoryReveal", () => {
    const ctx = makeCtx(3, [], true); // isSpectator = true
    dismiss.call(ctx);
    expect(ctx.$store.commit).not.toHaveBeenCalled();
  });

  it("ST dismiss commits session/clearVictoryReveal", () => {
    const ctx = makeCtx(3, [], false); // isSpectator = false
    dismiss.call(ctx);
    expect(ctx.$store.commit).toHaveBeenCalledWith(
      "session/clearVictoryReveal"
    );
  });
});

// ─────────────────────────────────────────────────────────────
// isWinner
// ─────────────────────────────────────────────────────────────
describe("VictoryReveal — isWinner", () => {
  it("returns true for a player index in snapshotWinners", () => {
    const ctx = { snapshotWinners: [0, 2, 4] };
    expect(isWinner.call(ctx, 0)).toBe(true);
    expect(isWinner.call(ctx, 2)).toBe(true);
    expect(isWinner.call(ctx, 4)).toBe(true);
  });

  it("returns false for an index not in snapshotWinners", () => {
    const ctx = { snapshotWinners: [0, 2] };
    expect(isWinner.call(ctx, 1)).toBe(false);
    expect(isWinner.call(ctx, 3)).toBe(false);
  });

  it("returns false when snapshotWinners is empty", () => {
    const ctx = { snapshotWinners: [] };
    expect(isWinner.call(ctx, 0)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// playerPosition
// ─────────────────────────────────────────────────────────────
describe("VictoryReveal — playerPosition", () => {
  it("returns a transform style string", () => {
    const result = playerPosition.call({}, 0, 6);
    expect(result).toHaveProperty("transform");
    expect(typeof result.transform).toBe("string");
  });

  it("contains vh units in the transform", () => {
    const result = playerPosition.call({}, 0, 6);
    expect(result.transform).toMatch(/vh/);
  });

  it("first player (index 0, n=4) is placed at the top (negative Y offset)", () => {
    // index 0, angle = -π/2 → cos = 0, sin = -1 → y is negative
    const result = playerPosition.call({}, 0, 4);
    // y component should contain a negative number
    expect(result.transform).toMatch(/-\d+(\.\d+)?vh/);
  });

  it("returns {} when n is 0 (guard against division by zero)", () => {
    const result = playerPosition.call({}, 0, 0);
    expect(result).toEqual({});
  });

  it("calculates distinct positions for each player", () => {
    const n = 6;
    const positions = Array.from({ length: n }, (_, i) =>
      playerPosition.call({}, i, n)
    );
    const transforms = positions.map(p => p.transform);
    const unique = new Set(transforms);
    expect(unique.size).toBe(n);
  });
});
