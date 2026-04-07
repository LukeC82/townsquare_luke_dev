import VictoryCelebration from "@/components/VictoryCelebration.vue";

const {
  particleStyle,
  fadeOutSound,
  onVictoryDeclared,
  dismiss,
  playSound
} = VictoryCelebration.methods;

// ─────────────────────────────────────────────────────────────
// particleStyle
// ─────────────────────────────────────────────────────────────
describe("VictoryCelebration — particleStyle", () => {
  it("returns all required CSS variable keys", () => {
    const result = particleStyle.call({}, 1);
    expect(result).toHaveProperty("--angle");
    expect(result).toHaveProperty("--delay");
    expect(result).toHaveProperty("--size");
    expect(result).toHaveProperty("--distance");
  });

  it("distributes particles evenly: particle 1 and 21 are 180° apart", () => {
    const p1 = particleStyle.call({}, 1);
    const p21 = particleStyle.call({}, 21);
    const diff = Math.abs(
      parseFloat(p21["--angle"]) - parseFloat(p1["--angle"])
    );
    expect(diff).toBe(180);
  });

  it("angle uses deg units", () => {
    const result = particleStyle.call({}, 5);
    expect(result["--angle"]).toMatch(/deg$/);
  });

  it("delay uses seconds units", () => {
    const result = particleStyle.call({}, 3);
    expect(result["--delay"]).toMatch(/s$/);
  });

  it("size uses px units", () => {
    const result = particleStyle.call({}, 2);
    expect(result["--size"]).toMatch(/px$/);
  });

  it("distance uses vh units", () => {
    const result = particleStyle.call({}, 4);
    expect(result["--distance"]).toMatch(/vh$/);
  });
});

// ─────────────────────────────────────────────────────────────
// fadeOutSound
// ─────────────────────────────────────────────────────────────
describe("VictoryCelebration — fadeOutSound", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("pauses audio after all ticks complete", () => {
    const mockPause = jest.fn();
    const mockAudio = { volume: 0.5, pause: mockPause, paused: false };
    const ctx = {
      audioInstance: mockAudio,
      durationTimer: null
    };
    fadeOutSound.call(ctx);
    jest.runAllTimers();
    expect(mockPause).toHaveBeenCalled();
    expect(mockAudio.volume).toBe(0);
  });

  it("clears audioInstance immediately to prevent double-trigger", () => {
    const mockAudio = { volume: 0.2, pause: jest.fn() };
    const ctx = { audioInstance: mockAudio, durationTimer: null };
    fadeOutSound.call(ctx);
    expect(ctx.audioInstance).toBeNull();
  });

  it("does nothing when audioInstance is null", () => {
    const ctx = { audioInstance: null, durationTimer: null };
    expect(() => fadeOutSound.call(ctx)).not.toThrow();
  });

  it("cancels the duration timer", () => {
    const timer = setTimeout(() => {}, 9999);
    const ctx = { audioInstance: null, durationTimer: timer };
    fadeOutSound.call(ctx);
    // Should not throw — timer was cleared
    expect(ctx.durationTimer).toBe(timer); // reference unchanged, clearTimeout was called
  });
});

// ─────────────────────────────────────────────────────────────
// onVictoryDeclared
// ─────────────────────────────────────────────────────────────
describe("VictoryCelebration — onVictoryDeclared", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("resets dismissed to false", () => {
    const ctx = {
      dismissed: true,
      dismissTimer: null,
      playSound: jest.fn()
    };
    onVictoryDeclared.call(ctx);
    expect(ctx.dismissed).toBe(false);
  });

  it("sets a 20-second auto-dismiss timer", () => {
    const mockDismiss = jest.fn();
    const ctx = {
      dismissed: false,
      dismissTimer: null,
      playSound: jest.fn(),
      dismiss: mockDismiss
    };
    onVictoryDeclared.call(ctx);
    expect(mockDismiss).not.toHaveBeenCalled();
    jest.advanceTimersByTime(20000);
    expect(mockDismiss).toHaveBeenCalled();
  });

  it("cancels a previous dismiss timer before starting a new one", () => {
    const mockDismiss = jest.fn();
    const ctx = {
      dismissed: false,
      dismissTimer: null,
      playSound: jest.fn(),
      dismiss: mockDismiss
    };
    // First declaration
    onVictoryDeclared.call(ctx);
    // Second declaration at 5s
    jest.advanceTimersByTime(5000);
    onVictoryDeclared.call(ctx);
    // 20s after second declaration — should fire once
    jest.advanceTimersByTime(20000);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls playSound", () => {
    const mockPlaySound = jest.fn();
    const ctx = {
      dismissed: false,
      dismissTimer: null,
      playSound: mockPlaySound,
      dismiss: jest.fn()
    };
    onVictoryDeclared.call(ctx);
    expect(mockPlaySound).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// dismiss
// ─────────────────────────────────────────────────────────────
describe("VictoryCelebration — dismiss", () => {
  it("sets dismissed to true", () => {
    const ctx = {
      dismissed: false,
      dismissTimer: null,
      fadeOutSound: jest.fn(),
      session: { isSpectator: true },
      $store: { commit: jest.fn() }
    };
    dismiss.call(ctx);
    expect(ctx.dismissed).toBe(true);
  });

  it("calls fadeOutSound", () => {
    const mockFade = jest.fn();
    const ctx = {
      dismissed: false,
      dismissTimer: null,
      fadeOutSound: mockFade,
      session: { isSpectator: true },
      $store: { commit: jest.fn() }
    };
    dismiss.call(ctx);
    expect(mockFade).toHaveBeenCalled();
  });

  it("ST commits clearVictory to local Vuex", () => {
    const mockCommit = jest.fn();
    const ctx = {
      dismissed: false,
      dismissTimer: null,
      fadeOutSound: jest.fn(),
      session: { isSpectator: false },
      $store: { commit: mockCommit }
    };
    dismiss.call(ctx);
    expect(mockCommit).toHaveBeenCalledWith("session/clearVictory");
  });

  it("seated player does NOT commit clearVictory", () => {
    const mockCommit = jest.fn();
    const ctx = {
      dismissed: false,
      dismissTimer: null,
      fadeOutSound: jest.fn(),
      session: { isSpectator: true },
      $store: { commit: mockCommit }
    };
    dismiss.call(ctx);
    expect(mockCommit).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// playSound (mocked Audio API)
// ─────────────────────────────────────────────────────────────
describe("VictoryCelebration — playSound", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const makeCtx = (team = "evil", muted = false) => ({
    grimoire: { isMuted: muted },
    session: { winningTeam: team },
    audioInstance: null,
    durationTimer: null,
    audioConfig: {
      good: { volume: 0.2, startTime: 1.6, duration: 10000 },
      evil: { volume: 0.2, startTime: 0.5, duration: 5000 }
    },
    preloaded: {
      good: {
        volume: 1,
        currentTime: 0,
        play: jest.fn().mockResolvedValue(),
        pause: jest.fn()
      },
      evil: {
        volume: 1,
        currentTime: 0,
        play: jest.fn().mockResolvedValue(),
        pause: jest.fn()
      }
    },
    fadeOutSound: jest.fn()
  });

  it("does nothing when muted", () => {
    const ctx = makeCtx("evil", true);
    playSound.call(ctx);
    expect(ctx.preloaded.evil.play).not.toHaveBeenCalled();
  });

  it("plays the correct preloaded audio for the winning team", () => {
    const ctx = makeCtx("evil");
    playSound.call(ctx);
    expect(ctx.preloaded.evil.play).toHaveBeenCalled();
    expect(ctx.preloaded.good.play).not.toHaveBeenCalled();
  });

  it("sets volume and startTime from config", () => {
    const ctx = makeCtx("evil");
    playSound.call(ctx);
    expect(ctx.preloaded.evil.volume).toBe(0.2);
    expect(ctx.preloaded.evil.currentTime).toBe(0.5);
  });

  it("schedules fadeOutSound after configured duration", () => {
    const ctx = makeCtx("evil");
    playSound.call(ctx);
    expect(ctx.fadeOutSound).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5000);
    expect(ctx.fadeOutSound).toHaveBeenCalled();
  });

  it("stops existing audio before playing new", () => {
    const ctx = makeCtx("evil");
    const oldAudio = { pause: jest.fn() };
    ctx.audioInstance = oldAudio;
    playSound.call(ctx);
    expect(oldAudio.pause).toHaveBeenCalled();
  });
});
