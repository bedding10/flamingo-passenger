// Design tokens: the single import surface for spacing, radius, type, shadow
// and motion. Colours stay in `core/theme.ts` because they are theme-aware.
export { SPACING, type SpacingToken } from "./spacing";
export { RADIUS, type RadiusToken } from "./radius";
export { TYPE, type TypeToken } from "./typography";
export { SHADOW, type ShadowToken } from "./shadow";
export { DURATION, SPRING, PRESS_SCALE } from "./animation";
