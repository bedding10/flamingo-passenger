// Spacing scale (4pt grid). Screens use these instead of magic numbers so the
// whole app breathes with the same rhythm.
export const SPACING = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export type SpacingToken = keyof typeof SPACING;
