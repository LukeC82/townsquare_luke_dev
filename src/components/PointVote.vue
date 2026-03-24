<template>
  <div id="point-vote">
    <template v-if="session.pointVoteEnded">
      <div class="overlay results">
        <em class="title">Point Vote Result</em>
        <br />
        <template v-if="leaders.length === 0">
          <span class="summary">No votes were cast.</span>
        </template>
        <template v-else>
          <div
            class="result-entry"
            v-for="leaderIdx in leaders"
            :key="leaderIdx"
          >
            <span class="result-name">{{ players[leaderIdx].name }}</span>
            <span class="result-tally"
              >{{ leaderVoteCount }} vote{{
                leaderVoteCount !== 1 ? "s" : ""
              }}</span
            >
            <span class="result-voters"
              >Voters: {{ votersForPlayer(leaderIdx).join(", ") }}</span
            >
          </div>
        </template>
        <template v-if="!session.isSpectator">
          <div class="button-group">
            <div
              class="button"
              :class="{ disabled: session.markedPlayer === leaders[0] }"
              v-if="leaders.length === 1"
              @click="markTarget"
            >
              Mark Target
            </div>
            <div class="button" @click="clearMark">Clear Mark</div>
            <div class="button demon" @click="closeResults">Close</div>
          </div>
        </template>
      </div>
    </template>
    <template v-else>
      <div class="overlay">
        <em class="title">Point Vote</em>
        <br />
        <span class="summary">{{ centerText }}</span>
        <template v-if="!session.isSpectator">
          <div class="button-group">
            <div
              class="button townsfolk"
              v-if="!session.pointVoteCountdown"
              @click="startCountdown"
            >
              End Vote (3s)
            </div>
            <div class="button demon" @click="close">Close</div>
          </div>
        </template>
      </div>
      <transition name="blur">
        <div class="countdown" v-if="session.pointVoteCountdown">
          <span>3</span>
          <span>2</span>
          <span>1</span>
          <audio
            :autoplay="!grimoire.isMuted"
            src="../assets/sounds/countdown.mp3"
            :muted="grimoire.isMuted"
          ></audio>
        </div>
      </transition>
    </template>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  computed: {
    ...mapState("players", ["players"]),
    ...mapState(["session", "grimoire"]),
    ...mapGetters({ leaders: "session/pointVoteLeaders" }),
    centerText() {
      if (this.leaders.length === 0) return "No votes yet";
      const names = this.leaders.map(i => this.players[i].name).join(", ");
      const count = this.leaderVoteCount;
      return `Highest Vote is for player ${names}. Vote Tally ${count}`;
    },
    leaderVoteCount() {
      if (this.leaders.length === 0) return 0;
      return Object.values(this.session.pointVotes).filter(
        t => t === this.leaders[0]
      ).length;
    }
  },
  watch: {
    "session.pointVoteCountdown"(val) {
      if (val && !this.session.isSpectator) {
        setTimeout(() => {
          this.$store.commit("session/setPointVoteActive", false);
          this.$store.commit("session/setPointVoteEnded", true);
        }, 4000);
      }
    }
  },
  methods: {
    startCountdown() {
      this.$store.commit("session/setPointVoteCountdown", true);
    },
    close() {
      this.$store.commit("session/setPointVoteActive", false);
    },
    votersForPlayer(targetIdx) {
      return Object.entries(this.session.pointVotes)
        .filter(([, t]) => t === targetIdx)
        .map(([voterIdx]) =>
          this.players[voterIdx] ? this.players[voterIdx].name : null
        )
        .filter(Boolean);
    },
    markTarget() {
      if (this.leaders.length === 0) return;
      this.$store.commit("session/setMarkedPlayer", this.leaders[0]);
    },
    clearMark() {
      this.$store.commit("session/setMarkedPlayer", -1);
    },
    closeResults() {
      this.$store.commit("session/addPointVoteHistory", this.players);
      this.$store.commit("session/setPointVoteEnded", false);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "../vars.scss";

#point-vote {
  position: absolute;
  width: 20%;
  z-index: 20;
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: center;
  text-align: center;
  text-shadow: 0 1px 2px #000000, 0 -1px 2px #000000, 1px 0 2px #000000,
    -1px 0 2px #000000;

  &:after {
    content: " ";
    padding-bottom: 100%;
    display: block;
  }

  .title {
    color: $demon;
    font-style: normal;
    font-weight: bold;
    font-size: 120%;
  }

  .summary {
    font-size: 85%;
    line-height: 1.4;
  }
}

.overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.results {
  .result-entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 4px;
  }

  .result-name {
    font-weight: bold;
    font-size: 130%;
    color: $townsfolk;
  }

  .result-tally {
    font-size: 90%;
  }

  .result-voters {
    font-size: 78%;
    opacity: 0.85;
    line-height: 1.3;
  }
}

@keyframes countdown {
  0% {
    transform: scale(1.5);
    opacity: 0;
    filter: blur(20px);
  }
  10% {
    opacity: 1;
  }
  50% {
    transform: scale(1);
    filter: blur(0);
  }
  90% {
    color: $townsfolk;
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.countdown {
  display: flex;
  position: absolute;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  audio {
    height: 0;
    width: 0;
    visibility: hidden;
  }
  span {
    position: absolute;
    font-size: 8em;
    font-weight: bold;
    opacity: 0;
  }
  span:nth-child(1) {
    animation: countdown 1100ms normal forwards;
  }
  span:nth-child(2) {
    animation: countdown 1100ms normal forwards 1000ms;
  }
  span:nth-child(3) {
    animation: countdown 1100ms normal forwards 2000ms;
  }
}
</style>
