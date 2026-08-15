// Motion tokens of the component layer.
//
// The root motion language lives in `src/design/theme.ts` (`motion`) and drives
// pins, sheets and the drawer. The durations below belong to the component
// layer (buttons, illustrations, the route comet) and are deliberately kept as
// their own, slightly calmer values - changing them would change how the
// interface feels, which is out of scope here.
// Durations stay short so the interface always feels instant, and every
// consumer runs on the Reanimated UI thread (never JS timers for motion).
export const DURATION = {
  instant: 120,
  fast: 180,
  base: 240,
  slow: 360,
  route: 2600,
} as const;

export const SPRING = {
  damping: 19,
  stiffness: 190,
  mass: 0.9,
} as const;

// Scale applied while a button is held down.
export const PRESS_SCALE = 0.97;
