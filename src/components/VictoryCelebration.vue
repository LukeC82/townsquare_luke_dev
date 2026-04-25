<template>
  <transition name="victory-fade">
    <div
      v-if="session.gameEnded && !dismissed"
      class="victory-overlay"
      :class="session.winningTeam"
      @click="dismiss"
    >
      <div class="victory-content">
        <div class="victory-title">
          {{ session.winningTeam === "good" ? "Good Wins!" : "Evil Wins!" }}
        </div>
        <div class="victory-subtitle">
          {{
            session.winningTeam === "good"
              ? "The forces of good have prevailed!"
              : "Evil has conquered the town!"
          }}
        </div>
        <div class="victory-dismiss">
          {{
            !session.isSpectator
              ? "Click anywhere to prepare the grimoire reveal"
              : "Click anywhere to dismiss"
          }}
        </div>
      </div>
      <span
        v-for="i in 40"
        :key="i"
        class="particle"
        :style="particleStyle(i)"
      ></span>
    </div>
  </transition>
</template>

<script>
import { mapState } from "vuex";

export default {
  data() {
    return {
      dismissed: false,
      // ── Audio config per team — adjust these to taste ──────────────
      audioConfig: {
        good: {
          volume: 0.085, // 0.0 (silent) → 1.0 (full)
          startTime: 1.6, // seconds into the track to begin playback
          duration: 10000 // ms to play before auto-stopping (null = play to end)
        },
        evil: {
          volume: 0.085,
          startTime: 0.5,
          duration: 10000
        }
      }
      // ───────────────────────────────────────────────────────────────
    };
  },
  created() {
    this.audioInstance = null;
    this.durationTimer = null;
    this.dismissTimer = null;
    this.preloaded = {};
    this.preloadAudio();
  },
  beforeDestroy() {
    clearTimeout(this.dismissTimer);
    clearTimeout(this.durationTimer);
    if (this.audioInstance) {
      this.audioInstance.pause();
      this.audioInstance = null;
    }
  },
  computed: {
    ...mapState(["session", "grimoire"])
  },
  watch: {
    "session.sessionId"(val) {
      if (val) this.preloadAudio();
    },
    "session.victoryCount"(val) {
      if (val > 0) this.onVictoryDeclared();
    },
    "session.victoryRevealActive"(val) {
      if (val && !this.dismissed) this.dismiss();
    }
  },
  methods: {
    preloadAudio() {
      ["good", "evil"].forEach(team => {
        const audio = new Audio(`/sounds/${team}-wins.mp3`);
        audio.preload = "auto";
        audio.load();
        this.preloaded[team] = audio;
      });
    },
    onVictoryDeclared() {
      this.dismissed = false;
      clearTimeout(this.dismissTimer);
      this.dismissTimer = setTimeout(() => this.dismiss(), 20000);
      this.playSound();
    },
    dismiss() {
      this.dismissed = true;
      clearTimeout(this.dismissTimer);
      this.fadeOutSound();
      // ST clears local Vuex so new joiners don't inherit a stale victory state,
      // then re-opens the victory modal so they can adjust alignment and reveal.
      if (!this.session.isSpectator) {
        const team = this.session.winningTeam;
        this.$store.commit("session/clearVictory");
        this.$store.commit("session/setVictoryModalTeam", team);
      }
    },
    playSound() {
      if (this.grimoire.isMuted) return;
      const team = this.session.winningTeam;
      const config = this.audioConfig[team];
      if (!config) return;
      // Stop any currently playing audio immediately before starting new
      if (this.audioInstance) {
        this.audioInstance.pause();
        this.audioInstance = null;
        clearTimeout(this.durationTimer);
      }
      const audio = this.preloaded[team];
      if (!audio) return;
      audio.volume = config.volume;
      audio.currentTime = config.startTime;
      audio.play().catch(() => {});
      this.audioInstance = audio;
      if (config.duration !== null) {
        this.durationTimer = setTimeout(
          () => this.fadeOutSound(),
          config.duration
        );
      }
    },
    fadeOutSound() {
      const audio = this.audioInstance;
      this.audioInstance = null;
      clearTimeout(this.durationTimer);
      if (!audio) return;
      const startVolume = audio.volume;
      let tick = 0;
      const totalTicks = 20;
      const fade = setInterval(() => {
        tick++;
        audio.volume = startVolume * (1 - tick / totalTicks);
        if (tick >= totalTicks) {
          audio.pause();
          clearInterval(fade);
        }
      }, 50); // 10 × 50ms = 500ms
    },
    particleStyle(i) {
      const angle = (i / 40) * 360;
      const delay = (i % 8) * 0.15;
      const size = 6 + (i % 5) * 4;
      const distance = 30 + (i % 4) * 15;
      return {
        "--angle": `${angle}deg`,
        "--delay": `${delay}s`,
        "--size": `${size}px`,
        "--distance": `${distance}vh`
      };
    }
  }
};
</script>

<style lang="scss">
@import "../vars.scss";

.victory-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;

  &.good {
    background: radial-gradient(
      ellipse at center,
      rgba(20, 60, 140, 0.92) 0%,
      rgba(5, 10, 40, 0.97) 70%
    );
    .victory-title {
      color: #7ec8ff;
      text-shadow: 0 0 40px rgba(80, 160, 255, 0.9),
        0 0 80px rgba(40, 100, 255, 0.5);
    }
    .particle {
      background: radial-gradient(
        circle,
        #ffe87a 0%,
        #4da6ff 60%,
        transparent 100%
      );
    }
  }

  &.evil {
    background: radial-gradient(
      ellipse at center,
      rgba(100, 10, 10, 0.92) 0%,
      rgba(20, 0, 30, 0.97) 70%
    );
    .victory-title {
      color: #ff6060;
      text-shadow: 0 0 40px rgba(255, 60, 60, 0.9),
        0 0 80px rgba(180, 0, 0, 0.5);
    }
    .particle {
      background: radial-gradient(
        circle,
        #ffcc44 0%,
        #e03030 60%,
        transparent 100%
      );
    }
  }
}

.victory-content {
  text-align: center;
  animation: victory-appear 0.6s cubic-bezier(0.2, 0.8, 0.3, 1.2) both;
  pointer-events: none;
}

.victory-title {
  font-family: "Papyrus", "Palatino Linotype", serif;
  font-size: clamp(48px, 10vw, 120px);
  font-weight: bold;
  letter-spacing: 0.05em;
  line-height: 1;
  margin-bottom: 20px;
}

.victory-subtitle {
  font-size: clamp(16px, 2.5vw, 28px);
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.08em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  margin-bottom: 40px;
}

.victory-dismiss {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  animation: victory-dismiss-pulse 2s ease-in-out infinite;
}

// Particles radiate outward from centre
.particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: particle-burst 2.5s ease-out var(--delay) infinite;
}

@keyframes victory-appear {
  from {
    opacity: 0;
    transform: scale(0.4);
    filter: blur(12px);
  }
  to {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
}

@keyframes victory-dismiss-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes particle-burst {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0);
  }
  80% {
    opacity: 0.6;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--angle))
      translateY(calc(-1 * var(--distance)));
  }
}

.victory-fade-enter-active {
  transition: opacity 0.5s ease;
}
.victory-fade-leave-active {
  transition: opacity 0.4s ease;
}
.victory-fade-enter,
.victory-fade-leave-to {
  opacity: 0;
}
</style>
