import Vue from "vue";
import Vuex from "vuex";
import sessionModule from "@/store/modules/session";

Vue.use(Vuex);

const createStore = (overrides = {}) =>
  new Vuex.Store({
    modules: {
      session: {
        ...sessionModule,
        state: () => ({ ...sessionModule.state(), ...overrides })
      }
    }
  });

// ─────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────
describe("session — initial state", () => {
  it("has correct defaults", () => {
    const { session: s } = createStore().state;
    expect(s.gameEnded).toBe(false);
    expect(s.winningTeam).toBeNull();
    expect(s.victoryCount).toBe(0);
    expect(s.isNight).toBe(false);
    expect(s.isSpectator).toBe(false);
    expect(s.isHiddenVoting).toBe(false);
    expect(s.isReturnToTown).toBe(false);
    expect(s.pointVoteActive).toBe(false);
    expect(s.pointVotes).toEqual({});
    expect(s.voteHistory).toEqual([]);
    expect(s.nomination).toBe(false);
    expect(s.lockedVote).toBe(0);
    // Victory Reveal
    expect(s.victoryModalTeam).toBeNull();
    expect(s.victoryRevealActive).toBe(false);
    expect(s.victoryRevealSnapshot).toBeNull();
    expect(s.revealCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Victory
// ─────────────────────────────────────────────────────────────
describe("session — victory mutations", () => {
  it("declareVictory sets gameEnded and winningTeam", () => {
    const store = createStore();
    store.commit("session/declareVictory", "good");
    expect(store.state.session.gameEnded).toBe(true);
    expect(store.state.session.winningTeam).toBe("good");
  });

  it("declareVictory increments victoryCount each call", () => {
    const store = createStore();
    store.commit("session/declareVictory", "good");
    expect(store.state.session.victoryCount).toBe(1);
    store.commit("session/declareVictory", "evil");
    expect(store.state.session.victoryCount).toBe(2);
  });

  it("declareVictory increments victoryCount even for the same team", () => {
    const store = createStore();
    store.commit("session/declareVictory", "evil");
    store.commit("session/declareVictory", "evil");
    expect(store.state.session.victoryCount).toBe(2);
  });

  it("clearVictory resets gameEnded and winningTeam", () => {
    const store = createStore();
    store.commit("session/declareVictory", "good");
    store.commit("session/clearVictory");
    expect(store.state.session.gameEnded).toBe(false);
    expect(store.state.session.winningTeam).toBeNull();
  });

  it("setVictoryCount sets victoryCount directly", () => {
    const store = createStore();
    store.commit("session/setVictoryCount", 7);
    expect(store.state.session.victoryCount).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────
// Victory Reveal
// ─────────────────────────────────────────────────────────────
describe("session — victoryReveal mutations", () => {
  const snapshot = {
    players: [{ name: "Alice", role: { team: "townsfolk" } }],
    winners: [0],
    winningTeam: "good"
  };

  it("setVictoryReveal sets snapshot and activates reveal", () => {
    const store = createStore();
    store.commit("session/setVictoryReveal", snapshot);
    expect(store.state.session.victoryRevealActive).toBe(true);
    expect(store.state.session.victoryRevealSnapshot).toEqual(snapshot);
  });

  it("setVictoryReveal increments revealCount each call", () => {
    const store = createStore();
    store.commit("session/setVictoryReveal", snapshot);
    expect(store.state.session.revealCount).toBe(1);
    store.commit("session/setVictoryReveal", snapshot);
    expect(store.state.session.revealCount).toBe(2);
  });

  it("clearVictoryReveal resets active and snapshot", () => {
    const store = createStore();
    store.commit("session/setVictoryReveal", snapshot);
    store.commit("session/clearVictoryReveal");
    expect(store.state.session.victoryRevealActive).toBe(false);
    expect(store.state.session.victoryRevealSnapshot).toBeNull();
  });

  it("clearVictoryReveal does not reset revealCount", () => {
    const store = createStore();
    store.commit("session/setVictoryReveal", snapshot);
    store.commit("session/clearVictoryReveal");
    expect(store.state.session.revealCount).toBe(1);
  });

  it("setVictoryModalTeam sets the team", () => {
    const store = createStore();
    store.commit("session/setVictoryModalTeam", "evil");
    expect(store.state.session.victoryModalTeam).toBe("evil");
  });

  it("setVictoryModalTeam can be cleared to null", () => {
    const store = createStore({ victoryModalTeam: "good" });
    store.commit("session/setVictoryModalTeam", null);
    expect(store.state.session.victoryModalTeam).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Boolean Toggles
// ─────────────────────────────────────────────────────────────
describe("session — toggle mutations", () => {
  it.each([
    ["toggleNight", "isNight"],
    ["toggleHiddenVoting", "isHiddenVoting"],
    ["toggleReturnToTown", "isReturnToTown"]
  ])("%s flips the flag", (mutation, flag) => {
    const store = createStore();
    store.commit(`session/${mutation}`);
    expect(store.state.session[flag]).toBe(true);
    store.commit(`session/${mutation}`);
    expect(store.state.session[flag]).toBe(false);
  });

  it("toggleNight can be forced to a value", () => {
    const store = createStore();
    store.commit("session/toggleNight", true);
    expect(store.state.session.isNight).toBe(true);
    store.commit("session/toggleNight", false);
    expect(store.state.session.isNight).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// pointVoteLeaders getter
// ─────────────────────────────────────────────────────────────
describe("session — pointVoteLeaders getter", () => {
  it("returns [] when no votes cast", () => {
    const store = createStore();
    expect(store.getters["session/pointVoteLeaders"]).toEqual([]);
  });

  it("returns single leader when one player has most votes", () => {
    const store = createStore({ pointVotes: { 0: 1, 1: 1, 2: 1 } });
    expect(store.getters["session/pointVoteLeaders"]).toEqual([1]);
  });

  it("returns all tied leaders", () => {
    const store = createStore({ pointVotes: { 0: 1, 1: 2 } });
    const leaders = store.getters["session/pointVoteLeaders"];
    expect(leaders).toHaveLength(2);
    expect(leaders).toContain(1);
    expect(leaders).toContain(2);
  });

  it("handles all votes pointing at same player", () => {
    const store = createStore({ pointVotes: { 0: 0, 1: 0, 2: 0 } });
    expect(store.getters["session/pointVoteLeaders"]).toEqual([0]);
  });
});

// ─────────────────────────────────────────────────────────────
// Point Vote State
// ─────────────────────────────────────────────────────────────
describe("session — point vote mutations", () => {
  describe("setPointVoteActive", () => {
    it("activating resets pointVotes, countdown, and ended flags", () => {
      const store = createStore({
        pointVotes: { 0: 1 },
        pointVoteCountdown: true,
        pointVoteEnded: true
      });
      store.commit("session/setPointVoteActive", true);
      expect(store.state.session.pointVotes).toEqual({});
      expect(store.state.session.pointVoteCountdown).toBe(false);
      expect(store.state.session.pointVoteEnded).toBe(false);
      expect(store.state.session.pointVoteActive).toBe(true);
    });

    it("deactivating does not reset pointVotes", () => {
      const store = createStore({ pointVotes: { 0: 1 } });
      store.commit("session/setPointVoteActive", false);
      expect(store.state.session.pointVotes).toEqual({ 0: 1 });
    });
  });

  describe("castPointVote", () => {
    it("records a vote", () => {
      const store = createStore();
      store.commit("session/castPointVote", { voterIndex: 0, targetIndex: 2 });
      expect(store.state.session.pointVotes[0]).toBe(2);
    });

    it("removes a vote when targetIndex is null", () => {
      const store = createStore({ pointVotes: { 0: 2 } });
      store.commit("session/castPointVote", {
        voterIndex: 0,
        targetIndex: null
      });
      expect(store.state.session.pointVotes[0]).toBeUndefined();
    });

    it("overwrites an existing vote for the same voter", () => {
      const store = createStore({ pointVotes: { 0: 1 } });
      store.commit("session/castPointVote", { voterIndex: 0, targetIndex: 3 });
      expect(store.state.session.pointVotes[0]).toBe(3);
    });
  });

  describe("removePlayerFromPointVotes", () => {
    it("drops all votes involving the removed player", () => {
      // Players 0 and 1 vote for player 2; player 2 votes for player 0
      const store = createStore({
        pointVoteActive: true,
        pointVotes: { 0: 2, 1: 2, 2: 0 }
      });
      store.commit("session/removePlayerFromPointVotes", 2);
      expect(Object.keys(store.state.session.pointVotes)).toHaveLength(0);
    });

    it("decrements higher indices after the removed player", () => {
      // Players 0 and 1 vote for player 3; removing player 1
      const store = createStore({
        pointVoteActive: true,
        pointVotes: { 0: 3, 1: 3 }
      });
      store.commit("session/removePlayerFromPointVotes", 1);
      // voter 1 is dropped (they are the removed player)
      // voter 0 stays at 0, target 3 shifts to 2
      expect(store.state.session.pointVotes[0]).toBe(2);
      expect(store.state.session.pointVotes[1]).toBeUndefined();
    });

    it("is a no-op when point vote is not active or ended", () => {
      const store = createStore({
        pointVoteActive: false,
        pointVoteEnded: false,
        pointVotes: { 0: 1 }
      });
      store.commit("session/removePlayerFromPointVotes", 0);
      expect(store.state.session.pointVotes[0]).toBe(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Nomination & Vote
// ─────────────────────────────────────────────────────────────
describe("session — nomination & vote mutations", () => {
  it("nomination sets all nomination fields", () => {
    const store = createStore();
    store.commit("session/nomination", {
      nomination: [0, 1],
      votes: [false, false, false],
      votingSpeed: 500,
      lockedVote: 0,
      isVoteInProgress: false
    });
    expect(store.state.session.nomination).toEqual([0, 1]);
    expect(store.state.session.votingSpeed).toBe(500);
  });

  it("nomination without args clears active nomination", () => {
    const store = createStore({ nomination: [0, 1] });
    store.commit("session/nomination");
    expect(store.state.session.nomination).toBe(false);
  });

  it("lockVote increments by 1 when no argument given", () => {
    const store = createStore({ lockedVote: 2 });
    store.commit("session/lockVote");
    expect(store.state.session.lockedVote).toBe(3);
  });

  it("lockVote sets to a specific value", () => {
    const store = createStore();
    store.commit("session/lockVote", 5);
    expect(store.state.session.lockedVote).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────
// Vote History
// ─────────────────────────────────────────────────────────────
describe("session — vote history", () => {
  const mockPlayers = [
    { name: "Alice", role: { team: "townsfolk" }, isDead: false },
    { name: "Bob", role: { team: "demon" }, isDead: false },
    { name: "Charlie", role: { team: "minion" }, isDead: false }
  ];

  const completedVoteState = {
    nomination: [0, 1],
    votes: [true, false, true],
    lockedVote: 4 // > players.length (3)
  };

  describe("addHistory", () => {
    it("ST records a completed nomination", () => {
      const store = createStore({ ...completedVoteState, isSpectator: false });
      store.commit("session/addHistory", mockPlayers);
      expect(store.state.session.voteHistory).toHaveLength(1);
      const entry = store.state.session.voteHistory[0];
      expect(entry.nominator).toBe("Alice");
      expect(entry.nominee).toBe("Bob");
      expect(entry.votes).toContain("Alice");
      expect(entry.votes).toContain("Charlie");
    });

    it("calculates majority correctly (ceil of alive / 2)", () => {
      const store = createStore({ ...completedVoteState, isSpectator: false });
      store.commit("session/addHistory", mockPlayers);
      // 3 alive players → majority = ceil(3/2) = 2
      expect(store.state.session.voteHistory[0].majority).toBe(2);
    });

    it("spectator without permission does not record", () => {
      const store = createStore({
        ...completedVoteState,
        isSpectator: true,
        isVoteHistoryAllowed: false
      });
      store.commit("session/addHistory", mockPlayers);
      expect(store.state.session.voteHistory).toHaveLength(0);
    });

    it("spectator with explicit permission does record", () => {
      const store = createStore({
        ...completedVoteState,
        isSpectator: true,
        isVoteHistoryAllowed: true
      });
      store.commit("session/addHistory", mockPlayers);
      expect(store.state.session.voteHistory).toHaveLength(1);
    });

    it("does not record when vote is not yet complete", () => {
      const store = createStore({
        nomination: [0, 1],
        votes: [true, false],
        lockedVote: 2, // 2 <= players.length (3) — not done
        isSpectator: false
      });
      store.commit("session/addHistory", mockPlayers);
      expect(store.state.session.voteHistory).toHaveLength(0);
    });

    it("does not record when no active nomination", () => {
      const store = createStore({
        nomination: false,
        lockedVote: 10,
        isSpectator: false
      });
      store.commit("session/addHistory", mockPlayers);
      expect(store.state.session.voteHistory).toHaveLength(0);
    });
  });

  describe("addPointVoteHistory", () => {
    const pvPlayers = [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }];

    it("records when there is a single clear leader", () => {
      // Alice and Bob both point at Bob (index 1)
      const store = createStore({
        pointVotes: { 0: 1, 1: 1 },
        isSpectator: false
      });
      store.commit("session/addPointVoteHistory", pvPlayers);
      expect(store.state.session.voteHistory).toHaveLength(1);
      expect(store.state.session.voteHistory[0].nominee).toBe("Bob");
    });

    it("records correct voter names", () => {
      // Alice and Bob point at Charlie (index 2)
      const store = createStore({
        pointVotes: { 0: 2, 1: 2 },
        isSpectator: false
      });
      store.commit("session/addPointVoteHistory", pvPlayers);
      expect(store.state.session.voteHistory[0].votes).toEqual([
        "Alice",
        "Bob"
      ]);
    });

    it("does NOT record on a tie", () => {
      // One vote each for Alice and Bob
      const store = createStore({
        pointVotes: { 0: 1, 1: 0 },
        isSpectator: false
      });
      store.commit("session/addPointVoteHistory", pvPlayers);
      expect(store.state.session.voteHistory).toHaveLength(0);
    });

    it("does NOT record when no votes cast", () => {
      const store = createStore({ pointVotes: {}, isSpectator: false });
      store.commit("session/addPointVoteHistory", pvPlayers);
      expect(store.state.session.voteHistory).toHaveLength(0);
    });

    it("spectator without permission does not record", () => {
      const store = createStore({
        pointVotes: { 0: 1, 1: 1 },
        isSpectator: true,
        isVoteHistoryAllowed: false
      });
      store.commit("session/addPointVoteHistory", pvPlayers);
      expect(store.state.session.voteHistory).toHaveLength(0);
    });
  });

  describe("clearVoteHistory", () => {
    it("empties vote history", () => {
      const store = createStore({ voteHistory: [{ nominee: "Bob" }] });
      store.commit("session/clearVoteHistory");
      expect(store.state.session.voteHistory).toEqual([]);
    });
  });
});
