// Design tokens - the single import surface for the whole app.
//
// Hierarchy, one root only:
//   src/design/theme.ts   ROOT. Colours, radius, spacing, type, shadow, motion.
//   src/core/design/*     Component-level aliases derived from the root.
//   src/core/theme.ts     Theme-aware palette (light / dark) built on the root.
//
// Import tokens from here; never redefine a colour or a scale in a screen.
export { SPACING, type SpacingToken } from "./spacing";
export { RADIUS, type RadiusToken } from "./radius";
export { TYPE, type TypeToken } from "./typography";
export { SHADOW, type ShadowToken } from "./shadow";
export { DURATION, SPRING, PRESS_SCALE } from "./animation";

// Root tokens, re-exported so a screen never needs a second import path.
export {
  colors,
  radius,
  spacing,
  iconSize,
  touchTarget,
  typography,
  shadows,
  motion,
  theme,
} from "../../design/theme";
