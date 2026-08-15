// Spacing scale (4pt grid) used by the component layer.
//
// DERIVED, not a second source of truth: every value below either points at
// `src/design/theme.ts` (the root scale) or is a component-only step that the
// root does not define. Screens use these instead of magic numbers so the
// whole app breathes with the same rhythm.
import { spacing } from "../../design/theme";

export const SPACING = {
  none: 0,
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
  /** Component-only step, no equivalent in the root scale. */
  xxl: 28,
  xxxl: spacing["4xl"],
  // Compatibility names used by the original component tree.
  "2xl": spacing["2xl"],
  "3xl": spacing["3xl"],
  "4xl": spacing["4xl"],
} as const;

export type SpacingToken = keyof typeof SPACING;
