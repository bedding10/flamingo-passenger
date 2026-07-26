// Motion tokens. Durations stay short so the interface always feels instant,
// and every consumer runs on the Reanimated UI thread (never JS timers for
// continuous motion).
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
