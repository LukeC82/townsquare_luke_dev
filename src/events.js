// Change ACTIVE_EVENT to enable a seasonal theme.
const ACTIVE_EVENT = "default";

const configs = {
  default: {
    name: "default",
    backgroundsFolder: null, // uses assets/backgrounds/
    returnToTownSound: require("./assets/sounds/gong.mp3"),
    returnToTownDuration: 5500
  },
  xmas: {
    name: "xmas",
    backgroundsFolder: "xmas", // uses assets/backgrounds/xmas/
    returnToTownSound: require("./assets/sounds/santa-ho-ho-ho.mp3"),
    returnToTownDuration: 9500
  }
};

export default configs[ACTIVE_EVENT] || configs.default;
