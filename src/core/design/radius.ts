// Corner radius scale of the component layer. Large, consistent corners are a
// core part of the flaminGO look: floating panels, cards and pills.
//
// DERIVED where the root scale in `src/design/theme.ts` already has the exact
// same value; the remaining steps are component-only and are marked as such.
import { radius } from "../../design/theme";

export const RADIUS = {
  xs: radius.sm, // 8
  sm: radius.md, // 12
  md: radius.card, // 16
  /** Component-only steps (panels and the tall menu sheet). */
  lg: 22,
  xl: 28,
  sheet: 32,
  /** Pills are mandatory for primary CTAs - always the root value. */
  pill: radius.pill,
} as const;

export type RadiusToken = keyof typeof RADIUS;
