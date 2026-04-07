import PointVote from "@/components/PointVote.vue";

const {
  votersForPlayer,
  markTarget,
  clearMark,
  closeResults
} = PointVote.methods;
const { leaderVoteCount, centerText } = PointVote.computed;

const mockPlayers = [
  { name: "Alice" },
  { name: "Bob" },
  { name: "Charlie" },
  { name: "Dave" }
];

// ─────────────────────────────────────────────────────────────
// votersForPlayer
// ─────────────────────────────────────────────────────────────
describe("PointVote — votersForPlayer", () => {
  it("returns names of all players who voted for the target", () => {
    const ctx = {
      session: { pointVotes: { 0: 1, 1: 1, 2: 2 } },
      players: mockPlayers
    };
    // Players 0 (Alice) and 1 (Bob) point at player 1 (Bob)
    expect(votersForPlayer.call(ctx, 1)).toEqual(["Alice", "Bob"]);
  });

  it("returns empty array when no one voted for the target", () => {
    const ctx = {
      session: { pointVotes: { 0: 2 } },
      players: mockPlayers
    };
    expect(votersForPlayer.call(ctx, 1)).toEqual([]);
  });

  it("returns empty array when pointVotes is empty", () => {
    const ctx = { session: { pointVotes: {} }, players: mockPlayers };
    expect(votersForPlayer.call(ctx, 0)).toEqual([]);
  });

  it("filters out null entries for missing players", () => {
    const ctx = {
      session: { pointVotes: { 99: 0 } }, // voter at index 99 doesn't exist
      players: mockPlayers
    };
    expect(votersForPlayer.call(ctx, 0)).toEqual([]);
  });

  it("handles all players pointing at the same target", () => {
    const ctx = {
      session: { pointVotes: { 0: 2, 1: 2, 3: 2 } },
      players: mockPlayers
    };
    const result = votersForPlayer.call(ctx, 2);
    expect(result).toContain("Alice");
    expect(result).toContain("Bob");
    expect(result).toContain("Dave");
    expect(result).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────
// leaderVoteCount (computed)
// ─────────────────────────────────────────────────────────────
describe("PointVote — leaderVoteCount", () => {
  it("returns 0 when there are no leaders", () => {
    const ctx = {
      leaders: [],
      session: { pointVotes: {} }
    };
    expect(leaderVoteCount.call(ctx)).toBe(0);
  });

  it("counts votes for the leading player", () => {
    // Leader is player at index 1, votes from indices 0, 1, 2
    const ctx = {
      leaders: [1],
      session: { pointVotes: { 0: 1, 1: 1, 2: 1, 3: 2 } }
    };
    expect(leaderVoteCount.call(ctx)).toBe(3);
  });

  it("uses leaders[0] as the reference for counting in a tie", () => {
    const ctx = {
      leaders: [0, 1],
      session: { pointVotes: { 2: 0, 3: 1 } }
    };
    // leaders[0] is 0; one vote for player 0
    expect(leaderVoteCount.call(ctx)).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// centerText (computed)
// ─────────────────────────────────────────────────────────────
describe("PointVote — centerText", () => {
  it("shows 'No votes yet' when there are no leaders", () => {
    const ctx = {
      leaders: [],
      players: mockPlayers,
      leaderVoteCount: 0
    };
    expect(centerText.call(ctx)).toBe("No votes yet");
  });

  it("includes the leader name and vote tally", () => {
    const ctx = {
      leaders: [1],
      players: mockPlayers,
      leaderVoteCount: 3
    };
    const text = centerText.call(ctx);
    expect(text).toContain("Bob");
    expect(text).toContain("3");
  });

  it("includes all tied leader names", () => {
    const ctx = {
      leaders: [0, 2],
      players: mockPlayers,
      leaderVoteCount: 2
    };
    const text = centerText.call(ctx);
    expect(text).toContain("Alice");
    expect(text).toContain("Charlie");
  });
});

// ─────────────────────────────────────────────────────────────
// markTarget
// ─────────────────────────────────────────────────────────────
describe("PointVote — markTarget", () => {
  it("marks the leading player", () => {
    const mockCommit = jest.fn();
    const ctx = {
      leaders: [2],
      $store: { commit: mockCommit }
    };
    markTarget.call(ctx);
    expect(mockCommit).toHaveBeenCalledWith("session/setMarkedPlayer", 2);
  });

  it("marks leaders[0] when tied", () => {
    const mockCommit = jest.fn();
    const ctx = {
      leaders: [1, 3],
      $store: { commit: mockCommit }
    };
    markTarget.call(ctx);
    expect(mockCommit).toHaveBeenCalledWith("session/setMarkedPlayer", 1);
  });

  it("does nothing when there are no leaders", () => {
    const mockCommit = jest.fn();
    const ctx = {
      leaders: [],
      $store: { commit: mockCommit }
    };
    markTarget.call(ctx);
    expect(mockCommit).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// clearMark
// ─────────────────────────────────────────────────────────────
describe("PointVote — clearMark", () => {
  it("commits setMarkedPlayer with -1", () => {
    const mockCommit = jest.fn();
    clearMark.call({ $store: { commit: mockCommit } });
    expect(mockCommit).toHaveBeenCalledWith("session/setMarkedPlayer", -1);
  });
});

// ─────────────────────────────────────────────────────────────
// closeResults
// ─────────────────────────────────────────────────────────────
describe("PointVote — closeResults", () => {
  it("commits addPointVoteHistory with players then ends vote", () => {
    const mockCommit = jest.fn();
    const ctx = {
      players: mockPlayers,
      $store: { commit: mockCommit }
    };
    closeResults.call(ctx);
    expect(mockCommit).toHaveBeenCalledWith(
      "session/addPointVoteHistory",
      mockPlayers
    );
    expect(mockCommit).toHaveBeenCalledWith("session/setPointVoteEnded", false);
  });
});
