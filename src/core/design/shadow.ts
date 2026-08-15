import type { ViewStyle } from "react-native";
import { colors } from "../../design/theme";

// Soft elevation tokens. Shadow colour is intentionally neutral black in both
// themes: on dark surfaces it reads as depth, on light surfaces as a soft lift.
const SHADOW_TINT = colors.ink;

export const SHADOW = {
  card: {
    shadowColor: SHADOW_TINT,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  floating: {
    shadowColor: SHADOW_TINT,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  sheet: {
    shadowColor: SHADOW_TINT,
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
} satisfies Record<string, ViewStyle>;

export type ShadowToken = keyof typeof SHADOW;
