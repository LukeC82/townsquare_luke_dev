<template>
  <div v-if="team" class="victory-modal-backdrop" @click.self="close">
    <div class="victory-modal" :class="team">
      <h2 class="modal-title">
        {{ team === "good" ? "Good Wins" : "Evil Wins" }}
      </h2>
      <p class="modal-sub">Select the winners — click tokens to toggle</p>
      <p class="winner-count">
        {{ selectedCount }} winner{{ selectedCount !== 1 ? "s" : "" }} selected
      </p>

      <div class="player-grid">
        <div
          v-for="(player, i) in players"
          :key="i"
          class="player-card"
          :class="{
            selected: winners[i],
            dead: player.isDead,
            'no-role': !player.role || !player.role.id
          }"
          :style="playerPosition(i, players.length)"
          @click="toggleWinner(i)"
        >
          <div class="card-token-wrap">
            <Token :role="player.role || {}" />
            <div
              class="alignment-overlay"
              :class="player.alignment"
              v-if="player.alignment"
            ></div>
            <div
              class="alignment-indicator"
              :class="player.alignment || 'unset'"
              @click.stop="cycleAlignment(i)"
            ></div>
            <div class="card-shroud" v-if="player.isDead"></div>
          </div>
          <div class="card-name">{{ player.name || "(empty)" }}</div>
          <div class="card-team" v-if="player.role && player.role.team">
            {{ player.role.team }}
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <span class="action-btn close-btn" @click="close">Close</span>
        <span class="action-btn declare-btn" @click="declareVictory">
          Declare Victory
        </span>
        <span
          class="action-btn reveal-btn"
          :class="{ disabled: selectedCount === 0 }"
          @click="revealGrimoire"
        >
          Reveal Grimoire
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import Token from "./Token.vue";

export default {
  components: { Token },
  computed: {
    ...mapState(["session"]),
    ...mapState("players", ["players"]),
    team() {
      return this.session.victoryModalTeam;
    },
    selectedCount() {
      return this.winners.filter(Boolean).length;
    }
  },
  data() {
    return {
      winners: []
    };
  },
  watch: {
    team(val) {
      if (val) this.initWinners();
    }
  },
  methods: {
    initWinners() {
      const team = this.team;
      this.winners = this.players.map(player => {
        if (!player.role || !player.role.team) return false;
        // Explicit alignment set by ST overrides team default
        if (player.alignment === "good") return team === "good";
        if (player.alignment === "evil") return team === "evil";
        // Fall back to role team membership
        if (team === "good") {
          return (
            player.role.team === "townsfolk" || player.role.team === "outsider"
          );
        }
        if (team === "evil") {
          return player.role.team === "demon" || player.role.team === "minion";
        }
        return false;
      });
    },
    toggleWinner(i) {
      this.$set(this.winners, i, !this.winners[i]);
    },
    close() {
      this.$store.commit("session/setVictoryModalTeam", null);
    },
    declareVictory() {
      this.$store.commit("session/clearVictoryReveal");
      this.$store.commit("session/declareVictory", this.team);
      this.$store.commit("session/setVictoryModalTeam", null);
    },
    cycleAlignment(i) {
      const player = this.players[i];
      const current = player.alignment;
      const roleTeam = player.role && player.role.team;
      let next;
      if (roleTeam === "traveler") {
        // Full three-step cycle for travellers
        next =
          current === null ? "good" : current === "good" ? "evil" : null;
      } else {
        // Two-step: toggle to opposite of base team, or back to null
        const baseEvil = roleTeam === "minion" || roleTeam === "demon";
        const opposite = baseEvil ? "good" : "evil";
        next = current === null ? opposite : null;
      }
      this.$store.commit("players/update", {
        player,
        property: "alignment",
        value: next
      });
      // Auto-update winner selection based on the new alignment
      let isWinner;
      if (!roleTeam) {
        isWinner = false;
      } else if (next === "good") {
        isWinner = this.team === "good";
      } else if (next === "evil") {
        isWinner = this.team === "evil";
      } else if (this.team === "good") {
        isWinner = roleTeam === "townsfolk" || roleTeam === "outsider";
      } else if (this.team === "evil") {
        isWinner = roleTeam === "demon" || roleTeam === "minion";
      } else {
        isWinner = false;
      }
      this.$set(this.winners, i, isWinner);
    },
    revealGrimoire() {
      if (this.selectedCount === 0) return;
      const team = this.team;
      const snapshot = {
        players: this.players.map(player => ({
          name: player.name,
          role:
            player.role && player.role.id
              ? {
                  id: player.role.id,
                  name: player.role.name,
                  team: player.role.team,
                  image: player.role.image,
                  imageAlt: player.role.imageAlt
                }
              : {},
          alignment: player.alignment,
          isDead: player.isDead,
          pronouns: player.pronouns
        })),
        winners: this.winners.reduce((acc, isWinner, i) => {
          if (isWinner) acc.push(i);
          return acc;
        }, []),
        winningTeam: team
      };
      this.$store.commit("session/setVictoryReveal", snapshot);
      this.close();
    },
    playerPosition(i, n) {
      if (n === 0) return {};
      const angle = ((2 * Math.PI) / n) * i - Math.PI / 2;
      // Tighter radius than the full-screen reveal so tokens fit inside the modal
      const radius = Math.min(37, Math.max(21, n * 2.5));
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      return {
        transform: `translate(calc(-50% + ${x}vh), calc(-50% + ${y}vh))`
      };
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";

.victory-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 550;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
}

.victory-modal {
  background: rgba(10, 10, 20, 0.97);
  border-radius: 16px;
  padding: 28px 32px 24px;
  width: min(92vw, 1132px);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.9);

  &.good {
    border: 2px solid rgba(77, 166, 255, 0.5);
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(77, 166, 255, 0.15);
    .modal-title {
      color: #7ec8ff;
    }
    .reveal-btn {
      color: #4da6ff;
      border-color: #4da6ff;
      &:hover:not(.disabled) {
        background: rgba(77, 166, 255, 0.15);
      }
    }
  }

  &.evil {
    border: 2px solid rgba(224, 48, 48, 0.5);
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(224, 48, 48, 0.15);
    .modal-title {
      color: #ff6060;
    }
    .reveal-btn {
      color: #e03030;
      border-color: #e03030;
      &:hover:not(.disabled) {
        background: rgba(224, 48, 48, 0.15);
      }
    }
  }
}

.modal-title {
  font-family: "Papyrus", "Palatino Linotype", serif;
  font-size: 2rem;
  text-align: center;
  margin: 0;
}

.modal-sub {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  margin: 0;
}

.winner-count {
  text-align: center;
  color: rgba(255, 215, 0, 0.9);
  font-size: 0.9rem;
  font-weight: bold;
  margin: 0;
}

.player-grid {
  position: relative;
  flex: 1;
  min-height: 63vh;
  width: 100%;
}

.player-card {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 104px;
  text-align: center;
  cursor: pointer;

  &.selected {
    .card-token-wrap {
      border-radius: 50%;
      animation: winner-glow-ring 2.5s ease-in-out infinite;
    }
    .card-name {
      color: gold;
      font-weight: bold;
    }
  }

  &.dead .card-token-wrap {
    opacity: 0.6;
  }
}

@keyframes winner-glow-ring {
  0%,
  100% {
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.8),
      0 0 14px 4px rgba(255, 215, 0, 0.4);
  }
  50% {
    box-shadow: 0 0 0 3px gold, 0 0 26px 10px rgba(255, 215, 0, 0.7);
  }
}

.card-token-wrap {
  position: relative;
  width: 89px;
  height: 89px;

  >>> .token {
    height: 100%;
    cursor: default;
  }
}

.alignment-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  mix-blend-mode: color;
  z-index: 3;

  &.good {
    background: rgba(40, 110, 255, 0.85);
  }
  &.evil {
    background: rgba(220, 40, 40, 0.85);
  }
}

.alignment-indicator {
  position: absolute;
  width: 30%;
  height: 30%;
  border-radius: 50%;
  right: -8%;
  top: 10%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.6));
  cursor: pointer;
  z-index: 5;
  transition: transform 150ms ease, filter 150ms ease;

  &:hover {
    transform: scale(1.2);
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.5));
  }

  &.good {
    background: linear-gradient(180deg, #3a7aff 0%, #4da6ff 100%);
    border-color: black;
  }
  &.evil {
    background: linear-gradient(180deg, #a00 0%, #e03030 100%);
    border-color: black;
  }
  &.unset {
    background: transparent;
  }
}

.card-shroud {
  position: absolute;
  top: -14%;
  left: 0;
  width: 100%;
  height: 58%;
  background: url("../assets/shroud.png") top center no-repeat;
  background-size: auto 100%;
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.9));
  pointer-events: none;
  z-index: 4;
}

.card-name {
  font-size: 0.7rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.9);
  word-break: break-word;
  line-height: 1.2;
  max-width: 80px;
}

.card-team {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: capitalize;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding-top: 4px;
  flex-wrap: wrap;
}

.action-btn {
  cursor: pointer;
  padding: 6px 20px;
  border-radius: 20px;
  border: 2px solid;
  font-size: 0.9rem;
  font-weight: bold;
  transition: background 200ms, opacity 200ms;
  user-select: none;
}

.close-btn {
  color: rgba(255, 255, 255, 0.6);
  border-color: rgba(255, 255, 255, 0.3);
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}

.declare-btn {
  color: rgba(255, 255, 255, 0.85);
  border-color: rgba(255, 255, 255, 0.5);
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.reveal-btn {
  &.disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}
</style>
