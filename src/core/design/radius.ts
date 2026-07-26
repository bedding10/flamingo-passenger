// Corner radius scale. Large, consistent corners are a core part of the
// flaminGO look: floating panels, cards and pills.
export const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  sheet: 32,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof RADIUS;
