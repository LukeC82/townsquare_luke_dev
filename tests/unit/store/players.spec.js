import Vue from "vue";
import Vuex from "vuex";
import playersModule from "@/store/modules/players";
import sessionModule from "@/store/modules/session";

Vue.use(Vuex);

const createStore = (sessionOverrides = {}) =>
  new Vuex.Store({
    modules: {
      players: { ...playersModule },
      session: {
        ...sessionModule,
        state: () => ({ ...sessionModule.state(), ...sessionOverrides })
      }
    }
  });

// Helper: add a named player and return their store reference
const addPlayer = (store, name) => {
  store.commit("players/add", name);
  return store.state.players.players[store.state.players.players.length - 1];
};

// ─────────────────────────────────────────────────────────────
// add
// ─────────────────────────────────────────────────────────────
describe("players — add", () => {
  it("adds a player with the correct name", () => {
    const store = createStore();
    store.commit("players/add", "Alice");
    expect(store.state.players.players[0].name).toBe("Alice");
  });

  it("initialises all NEWPLAYER defaults", () => {
    const store = createStore();
    store.commit("players/add", "Alice");
    const p = store.state.players.players[0];
    expect(p.isDead).toBe(false);
    expect(p.isVoteless).toBe(false);
    expect(p.handRaised).toBe(false);
    expect(p.alignment).toBeNull();
    expect(p.role).toEqual({});
    expect(p.reminders).toEqual([]);
    expect(p.pronouns).toBe("");
  });

  it("appends multiple players in order", () => {
    const store = createStore();
    store.commit("players/add", "Alice");
    store.commit("players/add", "Bob");
    store.commit("players/add", "Charlie");
    const names = store.state.players.players.map(p => p.name);
    expect(names).toEqual(["Alice", "Bob", "Charlie"]);
  });
});

// ─────────────────────────────────────────────────────────────
// remove
// ─────────────────────────────────────────────────────────────
describe("players — remove", () => {
  it("removes the player at the given index", () => {
    const store = createStore();
    store.commit("players/add", "Alice");
    store.commit("players/add", "Bob");
    store.commit("players/remove", 0);
    expect(store.state.players.players).toHaveLength(1);
    expect(store.state.players.players[0].name).toBe("Bob");
  });

  it("removes a player from the middle of the list", () => {
    const store = createStore();
    ["Alice", "Bob", "Charlie"].forEach(n => store.commit("players/add", n));
    store.commit("players/remove", 1);
    const names = store.state.players.players.map(p => p.name);
    expect(names).toEqual(["Alice", "Charlie"]);
  });
});

// ─────────────────────────────────────────────────────────────
// swap
// ─────────────────────────────────────────────────────────────
describe("players — swap", () => {
  it("exchanges positions of two players", () => {
    const store = createStore();
    store.commit("players/add", "Alice");
    store.commit("players/add", "Bob");
    store.commit("players/swap", [0, 1]);
    expect(store.state.players.players[0].name).toBe("Bob");
    expect(store.state.players.players[1].name).toBe("Alice");
  });

  it("swapping non-adjacent players works", () => {
    const store = createStore();
    ["Alice", "Bob", "Charlie"].forEach(n => store.commit("players/add", n));
    store.commit("players/swap", [0, 2]);
    const names = store.state.players.players.map(p => p.name);
    expect(names).toEqual(["Charlie", "Bob", "Alice"]);
  });
});

// ─────────────────────────────────────────────────────────────
// move
// ─────────────────────────────────────────────────────────────
describe("players — move", () => {
  it("moves a player to a new position", () => {
    const store = createStore();
    ["Alice", "Bob", "Charlie"].forEach(n => store.commit("players/add", n));
    store.commit("players/move", [0, 2]);
    const names = store.state.players.players.map(p => p.name);
    expect(names).toEqual(["Bob", "Charlie", "Alice"]);
  });
});

// ─────────────────────────────────────────────────────────────
// update
// ─────────────────────────────────────────────────────────────
describe("players — update", () => {
  it("updates a boolean property", () => {
    const store = createStore();
    const player = addPlayer(store, "Alice");
    store.commit("players/update", { player, property: "isDead", value: true });
    expect(store.state.players.players[0].isDead).toBe(true);
  });

  it("updates a string property", () => {
    const store = createStore();
    const player = addPlayer(store, "Alice");
    store.commit("players/update", {
      player,
      property: "pronouns",
      value: "she/her"
    });
    expect(store.state.players.players[0].pronouns).toBe("she/her");
  });

  it("updates a role object", () => {
    const store = createStore();
    const player = addPlayer(store, "Alice");
    const role = { id: "imp", team: "demon" };
    store.commit("players/update", { player, property: "role", value: role });
    expect(store.state.players.players[0].role).toEqual(role);
  });

  it("is a no-op for a player not in the list", () => {
    const store = createStore();
    addPlayer(store, "Alice");
    const ghost = { name: "Ghost", isDead: false };
    store.commit("players/update", {
      player: ghost,
      property: "isDead",
      value: true
    });
    // Alice should be unchanged
    expect(store.state.players.players[0].isDead).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// resetAllAlignments
// ─────────────────────────────────────────────────────────────
describe("players — resetAllAlignments", () => {
  it("sets every player alignment to null", () => {
    const store = createStore();
    const alice = addPlayer(store, "Alice");
    const bob = addPlayer(store, "Bob");
    store.commit("players/update", {
      player: alice,
      property: "alignment",
      value: "evil"
    });
    store.commit("players/update", {
      player: bob,
      property: "alignment",
      value: "good"
    });
    store.commit("players/resetAllAlignments");
    store.state.players.players.forEach(p => expect(p.alignment).toBeNull());
  });

  it("is safe to call on an empty player list", () => {
    const store = createStore();
    expect(() => store.commit("players/resetAllAlignments")).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// clear
// ─────────────────────────────────────────────────────────────
describe("players — clear", () => {
  it("empties players, bluffs, and fabled", () => {
    const store = createStore();
    store.commit("players/add", "Alice");
    store.commit("players/clear");
    expect(store.state.players.players).toHaveLength(0);
    expect(store.state.players.bluffs).toHaveLength(0);
    expect(store.state.players.fabled).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// alive getter
// ─────────────────────────────────────────────────────────────
describe("players — alive getter", () => {
  it("counts non-dead players", () => {
    const store = createStore();
    const alice = addPlayer(store, "Alice");
    addPlayer(store, "Bob");
    addPlayer(store, "Charlie");
    store.commit("players/update", {
      player: alice,
      property: "isDead",
      value: true
    });
    expect(store.getters["players/alive"]).toBe(2);
  });

  it("returns full count when all alive", () => {
    const store = createStore();
    addPlayer(store, "Alice");
    addPlayer(store, "Bob");
    expect(store.getters["players/alive"]).toBe(2);
  });

  it("returns 0 when all are dead", () => {
    const store = createStore();
    const p = addPlayer(store, "Alice");
    store.commit("players/update", {
      player: p,
      property: "isDead",
      value: true
    });
    expect(store.getters["players/alive"]).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// nonTravelers getter
// ─────────────────────────────────────────────────────────────
describe("players — nonTravelers getter", () => {
  it("excludes traveler-team players from the count", () => {
    const store = createStore();
    const alice = addPlayer(store, "Alice");
    const bob = addPlayer(store, "Bob");
    store.commit("players/update", {
      player: alice,
      property: "role",
      value: { team: "townsfolk" }
    });
    store.commit("players/update", {
      player: bob,
      property: "role",
      value: { team: "traveler" }
    });
    expect(store.getters["players/nonTravelers"]).toBe(1);
  });

  it("is capped at 15", () => {
    const store = createStore();
    for (let i = 0; i < 16; i++) {
      const p = addPlayer(store, `Player ${i}`);
      store.commit("players/update", {
        player: p,
        property: "role",
        value: { team: "townsfolk" }
      });
    }
    expect(store.getters["players/nonTravelers"]).toBe(15);
  });
});

// ─────────────────────────────────────────────────────────────
// nightOrder getter
// ─────────────────────────────────────────────────────────────
describe("players — nightOrder getter", () => {
  it("returns a Map with an entry per player", () => {
    const store = createStore();
    addPlayer(store, "Alice");
    addPlayer(store, "Bob");
    const map = store.getters["players/nightOrder"];
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(2);
  });

  it("orders by firstNight and otherNight position", () => {
    const store = createStore();
    const alice = addPlayer(store, "Alice");
    const bob = addPlayer(store, "Bob");
    store.commit("players/update", {
      player: alice,
      property: "role",
      value: { firstNight: 2, otherNight: 3 }
    });
    store.commit("players/update", {
      player: bob,
      property: "role",
      value: { firstNight: 1, otherNight: 1 }
    });
    const map = store.getters["players/nightOrder"];
    const aliceOrder = map.get(store.state.players.players[0]);
    const bobOrder = map.get(store.state.players.players[1]);
    // Bob has lower first night index (1 < 2), so comes first
    expect(bobOrder.first).toBeLessThan(aliceOrder.first);
  });
});

// ─────────────────────────────────────────────────────────────
// clearRoles action
// ─────────────────────────────────────────────────────────────
describe("players — clearRoles action", () => {
  it("ST: resets all player state except name, id, pronouns", async () => {
    const store = createStore({ isSpectator: false });
    const alice = addPlayer(store, "Alice");
    store.commit("players/update", {
      player: alice,
      property: "role",
      value: { id: "imp", team: "demon" }
    });
    store.commit("players/update", {
      player: alice,
      property: "isDead",
      value: true
    });
    store.commit("players/update", {
      player: alice,
      property: "isVoteless",
      value: true
    });
    await store.dispatch("players/clearRoles");
    const updated = store.state.players.players[0];
    expect(updated.name).toBe("Alice");
    expect(updated.role).toEqual({});
    expect(updated.isDead).toBe(false);
    expect(updated.isVoteless).toBe(false);
    expect(updated.alignment).toBeNull();
  });

  it("spectator: preserves traveler roles", async () => {
    const store = createStore({ isSpectator: true });
    const alice = addPlayer(store, "Alice");
    store.commit("players/update", {
      player: alice,
      property: "role",
      value: { id: "apprentice", team: "traveler" }
    });
    await store.dispatch("players/clearRoles");
    expect(store.state.players.players[0].role.team).toBe("traveler");
  });

  it("spectator: clears non-traveler roles", async () => {
    const store = createStore({ isSpectator: true });
    const alice = addPlayer(store, "Alice");
    store.commit("players/update", {
      player: alice,
      property: "role",
      value: { id: "imp", team: "demon" }
    });
    await store.dispatch("players/clearRoles");
    expect(store.state.players.players[0].role).toEqual({});
  });

  it("spectator: always clears reminders", async () => {
    const store = createStore({ isSpectator: true });
    const alice = addPlayer(store, "Alice");
    store.commit("players/update", {
      player: alice,
      property: "reminders",
      value: ["reminder1"]
    });
    await store.dispatch("players/clearRoles");
    expect(store.state.players.players[0].reminders).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// randomize action
// ─────────────────────────────────────────────────────────────
describe("players — randomize action", () => {
  it("preserves all players after shuffle", async () => {
    const store = createStore();
    const names = ["Alice", "Bob", "Charlie", "Dave", "Eve"];
    names.forEach(n => store.commit("players/add", n));
    await store.dispatch("players/randomize");
    const shuffled = store.state.players.players.map(p => p.name);
    expect(shuffled.sort()).toEqual(names.slice().sort());
  });

  it("does not change player count", async () => {
    const store = createStore();
    ["Alice", "Bob", "Charlie"].forEach(n => store.commit("players/add", n));
    await store.dispatch("players/randomize");
    expect(store.state.players.players).toHaveLength(3);
  });
});
