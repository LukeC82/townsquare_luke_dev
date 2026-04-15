import VictoryReveal from "@/components/VictoryReveal.vue";

const {
  startReveal,
  dismiss,
  isWinner,
  playerPosition,
  isTrueRevealed,
  startTrueReveal,
  triggerFinalPair
} = VictoryReveal.methods;
const { allRevealed } = VictoryReveal.computed;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

// Shared state that every ctx object needs — extracted to avoid duplication
// between makeCtx and makeMixedCtx.
const BASE_CTX_PROPS = {
  dismissed: false,
  revealedIndices: [],
  revealOrder: [],
  revealIdx: 0,
  phase1Timer: null,
  phase2Interval: null,
  revealedTrueIndices: [],
  trueRevealOrder: [],
  trueRevealIdx: 0,
  trueRevealInterval: null,
  extrasVisible: false,
  bluffsTimer: null,
  snapshotExtras: { bluffs: [], fabled: [] },
  scheduleExtras: VictoryReveal.methods.scheduleExtras,
  finalPairIndices: [],
  finalPairShaking: false,
  finalPairRevealed: false,
  finalShakeTimer: null,
  finalRevealTimer: null,
  triggerFinalPair: VictoryReveal.methods.triggerFinalPair,
  startTrueReveal: VictoryReveal.methods.startTrueReveal,
  effectiveAlignment: VictoryReveal.methods.effectiveAlignment
};

const makeCtx = (
  playerCount = 5,
  winners = [],
  isSpectator = true,
  winningTeam = "evil"
) => ({
  ...BASE_CTX_PROPS,
  snapshotPlayers: Array.from({ length: playerCount }, (_, i) => ({
    name: `Player ${i}`,
    role: { team: "townsfolk" },
    alignment: null,
    isDead: false
  })),
  snapshotWinners: winners,
  winningTeam,
  session: { isSpectator },
  $store: { commit: jest.fn() }
});

// Fixed player set used by reveal-order tests (good/evil mix)
const MIXED_PLAYERS = [
  { name: "Alice", role: { team: "townsfolk" }, alignment: null, isDead: false }, // good
  { name: "Bob",   role: { team: "minion"    }, alignment: null, isDead: false }, // evil
  { name: "Carol", role: { team: "outsider"  }, alignment: null, isDead: false }, // good
  { name: "Dave",  role: { team: "demon"     }, alignment: null, isDead: false }, // evil
  { name: "Eve",   role: { team: "townsfolk" }, alignment: null, isDead: false }  // good
];

const makeMixedCtx = (winningTeam = "evil") => ({
  ...BASE_CTX_PROPS,
  // Fresh copies so mutations in one test don't affect others
  snapshotPlayers: MIXED_PLAYERS.map(p => ({ ...p })),
  snapshotWinners: [],
  winningTeam,
  session: { isSpectator: true },
  $store: { commit: jest.fn() }
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
    jest.advanceTimersByTime(1000 + 650); // Phase 1 + 1 × 650ms interval
    expect(ctx.revealedIndices).toHaveLength(1);
  });

  it("all tokens revealed after Phase 1 + n × 650ms", () => {
    const n = 4;
    const ctx = makeCtx(n);
    startReveal.call(ctx);
    jest.advanceTimersByTime(1000 + n * 650);
    expect(ctx.revealedIndices).toHaveLength(n);
  });

  it("each revealed index is within bounds", () => {
    const n = 5;
    const ctx = makeCtx(n);
    startReveal.call(ctx);
    jest.advanceTimersByTime(1000 + n * 650);
    ctx.revealedIndices.forEach(idx => {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(n);
    });
  });

  it("no duplicate indices after full reveal", () => {
    const n = 5;
    const ctx = makeCtx(n);
    startReveal.call(ctx);
    jest.advanceTimersByTime(1000 + n * 650);
    const unique = new Set(ctx.revealedIndices);
    expect(unique.size).toBe(n);
  });

  it("re-calling startReveal resets and replays from Phase 1", () => {
    const ctx = makeCtx(3);
    startReveal.call(ctx);
    jest.advanceTimersByTime(1000 + 650); // Phase 1 + 1 × 650ms = 1 token revealed
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

  it("when no alive evil exists, no evil player occupies the tail (dead evil stays in body)", () => {
    // Both evil players dead — alive-only Rule 2 skips the evil tail slot.
    // Last position is the alive winning-team (evil) rep... but there is none,
    // so only the alive losing-team (good) rep is appended last.
    const ctx = makeMixedCtx("evil");
    ctx.snapshotPlayers[1].isDead = true; // Bob (evil) dead
    ctx.snapshotPlayers[3].isDead = true; // Dave (evil) dead
    startReveal.call(ctx);
    const last = ctx.revealOrder[ctx.revealOrder.length - 1];
    // Last must be an alive player (the good losing-team rep)
    expect(ctx.snapshotPlayers[last].isDead).toBe(false);
    expect(ctx.effectiveAlignment(ctx.snapshotPlayers[last])).toBe("good");
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
    jest.advanceTimersByTime(1000 + 650); // Phase 1 + 1 token revealed
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
// isTrueRevealed / startTrueReveal
// ─────────────────────────────────────────────────────────────
describe("VictoryReveal — true token reveal", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("isTrueRevealed returns false before startTrueReveal runs", () => {
    const ctx = makeCtx(3);
    expect(isTrueRevealed.call(ctx, 0)).toBe(false);
  });

  it("startTrueReveal does nothing when no players have a trueRole", () => {
    const ctx = makeCtx(3);
    startTrueReveal.call(ctx);
    jest.advanceTimersByTime(2000);
    expect(ctx.revealedTrueIndices).toHaveLength(0);
  });

  it("startTrueReveal reveals only persona players, one per 450ms", () => {
    const ctx = makeCtx(3);
    ctx.snapshotPlayers[1].trueRole = { id: "philosopher" };
    startTrueReveal.call(ctx);
    expect(ctx.revealedTrueIndices).toHaveLength(0);
    jest.advanceTimersByTime(450);
    expect(ctx.revealedTrueIndices).toEqual([1]);
  });

  it("startTrueReveal reveals all persona players after n × 450ms", () => {
    const ctx = makeCtx(4);
    ctx.snapshotPlayers[0].trueRole = { id: "drunk" };
    ctx.snapshotPlayers[2].trueRole = { id: "philosopher" };
    startTrueReveal.call(ctx);
    jest.advanceTimersByTime(2 * 450);
    expect(ctx.revealedTrueIndices).toHaveLength(2);
  });

  it("startReveal resets revealedTrueIndices", () => {
    const ctx = makeCtx(3);
    ctx.revealedTrueIndices = [1];
    startReveal.call(ctx);
    expect(ctx.revealedTrueIndices).toHaveLength(0);
  });

  it("dismiss clears the trueRevealInterval", () => {
    const ctx = makeCtx(3);
    ctx.snapshotPlayers[0].trueRole = { id: "drunk" };
    startTrueReveal.call(ctx);
    dismiss.call(ctx);
    jest.advanceTimersByTime(2000);
    expect(ctx.revealedTrueIndices).toHaveLength(0);
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
// Final 3 — allRevealed with finalPairIndices
// ─────────────────────────────────────────────────────────────
describe("VictoryReveal — allRevealed with Final 3", () => {
  it("is true when n-2 players revealed and 2 are in finalPairIndices", () => {
    const ctx = {
      revealedIndices: [0, 1, 2],
      snapshotPlayers: [{}, {}, {}, {}, {}], // 5 players
      finalPairIndices: [3, 4]
    };
    expect(VictoryReveal.computed.allRevealed.call(ctx)).toBe(true);
  });

  it("is false when fewer than n-2 revealed with finalPairIndices", () => {
    const ctx = {
      revealedIndices: [0, 1],
      snapshotPlayers: [{}, {}, {}, {}, {}],
      finalPairIndices: [3, 4]
    };
    expect(VictoryReveal.computed.allRevealed.call(ctx)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Final 3 — startReveal with snapshot finalPair
// ─────────────────────────────────────────────────────────────
describe("VictoryReveal — Final 3 startReveal", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("populates finalPairIndices from snapshot.finalPair", () => {
    const ctx = makeCtx(5);
    ctx.session = {
      isSpectator: true,
      victoryRevealSnapshot: {
        finalThree: true,
        finalPair: [2, 4],
        revealOrder: [0, 1, 3]
      }
    };
    startReveal.call(ctx);
    expect(ctx.finalPairIndices).toEqual([2, 4]);
  });

  it("revealOrder has n-2 entries when finalThree is active", () => {
    const ctx = makeCtx(5);
    ctx.session = {
      isSpectator: true,
      victoryRevealSnapshot: {
        finalThree: true,
        finalPair: [2, 4],
        revealOrder: [0, 1, 3]
      }
    };
    startReveal.call(ctx);
    expect(ctx.revealOrder).toHaveLength(3);
    expect(ctx.revealOrder).toEqual([0, 1, 3]);
  });

  it("finalPairIndices is empty when snapshot has no finalThree", () => {
    const ctx = makeCtx(5);
    ctx.session = { isSpectator: true, victoryRevealSnapshot: null };
    startReveal.call(ctx);
    expect(ctx.finalPairIndices).toEqual([]);
  });

  it("resets finalPairShaking and finalPairRevealed on re-trigger", () => {
    const ctx = makeCtx(5);
    ctx.finalPairShaking = true;
    ctx.finalPairRevealed = true;
    ctx.session = { isSpectator: true };
    startReveal.call(ctx);
    expect(ctx.finalPairShaking).toBe(false);
    expect(ctx.finalPairRevealed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Final 3 — triggerFinalPair
// ─────────────────────────────────────────────────────────────
describe("VictoryReveal — triggerFinalPair", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("does nothing when finalPairIndices is empty", () => {
    const ctx = makeCtx(3);
    triggerFinalPair.call(ctx);
    jest.advanceTimersByTime(3000);
    expect(ctx.finalPairShaking).toBe(false);
    expect(ctx.finalPairRevealed).toBe(false);
  });

  it("sets finalPairShaking after 1000ms", () => {
    const ctx = makeCtx(5);
    ctx.finalPairIndices = [3, 4];
    triggerFinalPair.call(ctx);
    jest.advanceTimersByTime(1000);
    expect(ctx.finalPairShaking).toBe(true);
    expect(ctx.finalPairRevealed).toBe(false);
  });

  it("sets finalPairRevealed and clears shake after 2000ms total", () => {
    const ctx = makeCtx(5);
    ctx.finalPairIndices = [3, 4];
    triggerFinalPair.call(ctx);
    jest.advanceTimersByTime(2000);
    expect(ctx.finalPairShaking).toBe(false);
    expect(ctx.finalPairRevealed).toBe(true);
  });

  it("dismiss cancels pending finalShakeTimer and finalRevealTimer", () => {
    const ctx = makeCtx(5);
    ctx.finalPairIndices = [3, 4];
    triggerFinalPair.call(ctx);
    jest.advanceTimersByTime(1000); // shake starts
    dismiss.call(ctx);
    jest.advanceTimersByTime(1000); // reveal should NOT fire
    expect(ctx.finalPairRevealed).toBe(false);
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
