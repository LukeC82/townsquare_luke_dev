import Vue from "vue";

/**
 * Handle a vote request.
 * If the vote is from a seat that is already locked, ignore it.
 * @param state session state
 * @param index seat of the player in the circle
 * @param vote true or false
 */
const handleVote = (state, [index, vote]) => {
  if (!state.nomination) return;
  state.votes = [...state.votes];
  state.votes[index] = vote === undefined ? !state.votes[index] : vote;
};

const state = () => ({
  sessionId: "",
  isSpectator: false,
  isReconnecting: false,
  playerCount: 0,
  ping: 0,
  playerId: "",
  claimedSeat: -1,
  nomination: false,
  votes: [],
  lockedVote: 0,
  votingSpeed: 1000,
  isVoteInProgress: false,
  voteHistory: [],
  markedPlayer: -1,
  isVoteHistoryAllowed: false,
  isRolesDistributed: false,
  isNight: false,
  isHiddenVoting: false,
  isReturnToTown: false,
  pointVoteActive: false,
  pointVotes: {},
  pointVoteCountdown: false,
  pointVoteEnded: false,
  gameEnded: false,
  winningTeam: null,
  victoryCount: 0,
  victoryModalTeam: null,
  victoryRevealActive: false,
  victoryRevealSnapshot: null,
  revealCount: 0
});

const getters = {
  pointVoteLeaders(state) {
    const tally = {};
    for (const targetIdx of Object.values(state.pointVotes)) {
      tally[targetIdx] = (tally[targetIdx] || 0) + 1;
    }
    const max = Math.max(...Object.values(tally), 0);
    if (max === 0) return [];
    return Object.keys(tally)
      .filter(k => tally[k] === max)
      .map(Number);
  }
};

// mutations helper functions
const set = key => (state, val) => {
  state[key] = val;
};

const toggleFlag = key => (state, val) => {
  state[key] = val === true || val === false ? val : !state[key];
};

// shared vote history accessibility check
const canRecord = state => state.isVoteHistoryAllowed || !state.isSpectator;

const mutations = {
  setPlayerId: set("playerId"),
  setSpectator: set("isSpectator"),
  setReconnecting: set("isReconnecting"),
  setPlayerCount: set("playerCount"),
  setPing: set("ping"),
  setVotingSpeed: set("votingSpeed"),
  setVoteInProgress: set("isVoteInProgress"),
  setMarkedPlayer: set("markedPlayer"),
  setNomination: set("nomination"),
  setVoteHistoryAllowed: set("isVoteHistoryAllowed"),
  claimSeat: set("claimedSeat"),
  distributeRoles: set("isRolesDistributed"),
  setSessionId(state, sessionId) {
    state.sessionId = sessionId
      .toLocaleLowerCase()
      .replace(/[^0-9a-z]/g, "")
      .slice(0, 10);
  },
  nomination(
    state,
    { nomination, votes, votingSpeed, lockedVote, isVoteInProgress } = {}
  ) {
    state.nomination = nomination || false;
    state.votes = votes || [];
    state.votingSpeed = votingSpeed || state.votingSpeed;
    state.lockedVote = lockedVote || 0;
    state.isVoteInProgress = isVoteInProgress || false;
  },
  /**
   * Create an entry in the vote history log. Requires current player array because it might change later in the game.
   * Only stores votes that were completed.
   * @param state
   * @param players
   */
  addHistory(state, players) {
    if (!canRecord(state)) return;
    if (!state.nomination || state.lockedVote <= players.length) return;
    const isExile = players[state.nomination[1]].role.team === "traveler";
    state.voteHistory.push({
      timestamp: new Date(),
      nominator: players[state.nomination[0]].name,
      nominee: players[state.nomination[1]].name,
      type: isExile ? "Exile" : "Execution",
      majority: Math.ceil(
        players.filter(player => !player.isDead || isExile).length / 2
      ),
      votes: players
        .filter((player, index) => state.votes[index])
        .map(({ name }) => name)
    });
  },
  /**
   * Record a Point Vote result in the vote history.
   * Only records when there is a single clear winner (no tie).
   * @param state
   * @param players
   */
  addPointVoteHistory(state, players) {
    if (!canRecord(state)) return;
    const tally = {};
    for (const t of Object.values(state.pointVotes)) {
      tally[t] = (tally[t] || 0) + 1;
    }
    const max = Math.max(...Object.values(tally), 0);
    if (max === 0) return;
    const leaders = Object.keys(tally)
      .filter(k => tally[k] === max)
      .map(Number);
    if (leaders.length !== 1) return;
    const nominee = players[leaders[0]] ? players[leaders[0]].name : "Unknown";
    const votes = Object.entries(state.pointVotes)
      .filter(([, t]) => t === leaders[0])
      .map(([voterIdx]) => (players[voterIdx] ? players[voterIdx].name : null))
      .filter(Boolean);
    state.voteHistory.push({
      timestamp: new Date(),
      nominator: "N/A",
      nominee,
      type: "Point Vote",
      majority: "N/A",
      votes
    });
  },
  clearVoteHistory(state) {
    state.voteHistory = [];
  },
  /**
   * Store a vote with and without syncing it to the live session.
   * This is necessary in order to prevent infinite voting loops.
   * @param state
   * @param vote
   */
  vote: handleVote,
  voteSync: handleVote,
  lockVote(state, lock) {
    state.lockedVote = lock !== undefined ? lock : state.lockedVote + 1;
  },
  toggleNight: toggleFlag("isNight"),
  toggleHiddenVoting: toggleFlag("isHiddenVoting"),
  toggleReturnToTown: toggleFlag("isReturnToTown"),
  /**
   * Re-index pointVotes after a player is removed.
   * Drops votes cast by or for the removed player; decrements all higher indices.
   */
  removePlayerFromPointVotes(state, removedIndex) {
    if (!state.pointVoteActive && !state.pointVoteEnded) return;
    const updated = {};
    for (const [voterIdxStr, targetIdxStr] of Object.entries(
      state.pointVotes
    )) {
      const voter = Number(voterIdxStr);
      const target = Number(targetIdxStr);
      if (voter === removedIndex || target === removedIndex) continue;
      const newVoter = voter > removedIndex ? voter - 1 : voter;
      const newTarget = target > removedIndex ? target - 1 : target;
      updated[newVoter] = newTarget;
    }
    state.pointVotes = updated;
  },
  declareVictory(state, team) {
    state.winningTeam = team;
    state.gameEnded = true;
    state.victoryCount++;
  },
  setVictoryCount: set("victoryCount"),
  clearVictory(state) {
    state.gameEnded = false;
    state.winningTeam = null;
  },
  setVictoryModalTeam: set("victoryModalTeam"),
  setVictoryReveal(state, snapshot) {
    state.victoryRevealSnapshot = snapshot;
    state.victoryRevealActive = true;
    state.revealCount++;
  },
  clearVictoryReveal(state) {
    state.victoryRevealActive = false;
    state.victoryRevealSnapshot = null;
  },
  setPointVoteActive(state, val) {
    state.pointVoteActive = val;
    if (val) {
      state.pointVotes = {};
      state.pointVoteCountdown = false;
      state.pointVoteEnded = false;
    }
  },
  setPointVoteCountdown: set("pointVoteCountdown"),
  setPointVoteEnded: set("pointVoteEnded"),
  castPointVote(state, { voterIndex, targetIndex }) {
    if (targetIndex === null) {
      Vue.delete(state.pointVotes, voterIndex);
    } else {
      Vue.set(state.pointVotes, voterIndex, targetIndex);
    }
  },
  castPointVoteSync(state, { voterIndex, targetIndex }) {
    if (targetIndex === null) {
      Vue.delete(state.pointVotes, voterIndex);
    } else {
      Vue.set(state.pointVotes, voterIndex, targetIndex);
    }
  },
  setPointVotes(state, votes) {
    state.pointVotes = votes || {};
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations
};
