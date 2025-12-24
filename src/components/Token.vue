<template>
  <div class="token" @click="setRole" @mouseenter="showAbility" @mouseleave="hideAbility" :class="[role.id]">
    <span
      class="icon"
      v-if="role.id"
      :style="{
        backgroundImage: `url(${
          role.image && grimoire.isImageOptIn
            ? role.image
            : require('../assets/icons/' + (role.imageAlt || role.id) + '.png')
        })`
      }"
    ></span>
    <span
      class="leaf-left"
      v-if="role.firstNight || role.firstNightReminder"
    ></span>
    <span
      class="leaf-right"
      v-if="role.otherNight || role.otherNightReminder"
    ></span>
    <span v-if="reminderLeaves" :class="['leaf-top' + reminderLeaves]"></span>
    <span class="leaf-orange" v-if="role.setup"></span>
    <svg viewBox="0 0 150 150" class="name">
      <path
        d="M 13 75 C 13 160, 138 160, 138 75"
        id="curve"
        fill="transparent"
      />
      <text
        width="150"
        x="66.6%"
        text-anchor="middle"
        class="label mozilla"
        :font-size="role.name | nameToFontSize"
      >
        <textPath xlink:href="#curve">
          {{ role.name }}
        </textPath>
      </text>
    </svg>
    <div class="edition" :class="[`edition-${role.edition}`, role.team]"></div>
    <!-- tooltip rendered into document.body for correct stacking -->
  </div>
</template>

<script>
import { mapState } from "vuex";

export default {
  name: "Token",
  props: {
    role: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    reminderLeaves: function() {
      return (
        (this.role.reminders || []).length +
        (this.role.remindersGlobal || []).length
      );
    },
    ...mapState(["grimoire"])
  },
  data() {
    return {
      tooltipEl: null
    };
  },
  filters: {
    nameToFontSize: name => (name && name.length > 10 ? "90%" : "110%")
  },
  methods: {
    setRole() {
      this.$emit("set-role");
    },
    showAbility() {
      if (!this.role || !this.role.ability) return;
      // create tooltip element if needed
      if (!this.tooltipEl) {
        this.tooltipEl = document.createElement('div');
        this.tooltipEl.className = 'token-ability';
        // base styles (use inline so not affected by scoped CSS)
        Object.assign(this.tooltipEl.style, {
          position: 'fixed',
          width: '250px',
          padding: '5px 10px',
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          borderRadius: '10px',
          border: '3px solid black',
          boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
          textAlign: 'left',
          fontSize: '80%',
          pointerEvents: 'none',
          opacity: '0',
          transition: 'opacity 150ms ease-in-out',
          zIndex: '100000'
        });
        document.body.appendChild(this.tooltipEl);
      }
      this.tooltipEl.textContent = this.role.ability;
      const rect = this.$el.getBoundingClientRect();
      const gap = 8;
      const tooltipWidth = parseInt(this.tooltipEl.style.width, 10) || 250;
      let left = rect.right + gap;
      if (left + tooltipWidth > window.innerWidth - gap) {
        left = rect.left - tooltipWidth - gap;
      }
      let top = rect.top + rect.height / 2;
      const minTop = gap + 8;
      const maxTop = window.innerHeight - gap - 8;
      if (top < minTop) top = minTop;
      if (top > maxTop) top = maxTop;
      Object.assign(this.tooltipEl.style, {
        left: `${Math.max(left, gap)}px`,
        top: `${top}px`,
        transform: 'translateY(-50%)',
        opacity: '1'
      });
    },
    hideAbility() {
      if (this.tooltipEl) this.tooltipEl.style.opacity = '0';
    }
  },
  mounted() {
    // nothing to do until hovered
  },
  beforeDestroy() {
    if (this.tooltipEl && this.tooltipEl.parentNode) {
      this.tooltipEl.parentNode.removeChild(this.tooltipEl);
      this.tooltipEl = null;
    }
  }
};
</script>

<style scoped lang="scss">
.token {
  border-radius: 50%;
  width: 100%;
  background: url("../assets/token.png") center center;
  background-size: 100%;
  text-align: center;
  border: 3px solid black;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 250ms;

  &:hover .name .label {
    stroke: black;
    fill: white;
    @-moz-document url-prefix() {
      &.mozilla {
        stroke: none;
        filter: drop-shadow(0 1.5px 0 black) drop-shadow(0 -1.5px 0 black)
          drop-shadow(1.5px 0 0 black) drop-shadow(-1.5px 0 0 black)
          drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5));
      }
    }
  }

  .icon,
  &:before {
    background-size: 100%;
    background-repeat: no-repeat;
    background-position: center 30%;
    position: absolute;
    width: 100%;
    height: 100%;
    margin-top: 3%;
  }

  span {
    position: absolute;
    width: 100%;
    height: 100%;
    background-size: 100%;
    pointer-events: none;

    &.leaf-left {
      background-image: url("../assets/leaf-left.png");
    }

    &.leaf-orange {
      background-image: url("../assets/leaf-orange.png");
    }

    &.leaf-right {
      background-image: url("../assets/leaf-right.png");
    }

    &.leaf-top1 {
      background-image: url("../assets/leaf-top1.png");
    }

    &.leaf-top2 {
      background-image: url("../assets/leaf-top2.png");
    }

    &.leaf-top3 {
      background-image: url("../assets/leaf-top3.png");
    }

    &.leaf-top4 {
      background-image: url("../assets/leaf-top4.png");
    }

    &.leaf-top5 {
      background-image: url("../assets/leaf-top5.png");
    }
  }

  .name {
    width: 100%;
    height: 100%;
    font-size: 24px; // svg fonts are relative to document font size
    .label {
      fill: black;
      stroke: white;
      stroke-width: 2px;
      paint-order: stroke;
      font-family: "Papyrus", serif;
      font-weight: bold;
      text-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
      letter-spacing: 1px;

      @-moz-document url-prefix() {
        &.mozilla {
          // Vue doesn't support scoped media queries, so we have to use a second css class
          stroke: none;
          text-shadow: none;
          filter: drop-shadow(0 1.5px 0 white) drop-shadow(0 -1.5px 0 white)
            drop-shadow(1.5px 0 0 white) drop-shadow(-1.5px 0 0 white)
            drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5));
        }
      }
    }
  }

  .edition {
    position: absolute;
    right: 0;
    bottom: 5px;
    width: 30px;
    height: 30px;
    background-size: 100%;
    display: none;
  }

  /* tooltip is rendered to document.body; styles applied inline in JS */
}
</style>
