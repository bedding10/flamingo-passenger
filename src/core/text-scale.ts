import { PixelRatio, Text, TextInput } from "react-native";

// Dynamic type: the OS font-size setting must work, but a 2x scale would break
// pill buttons and map cards. We allow growth up to a safe multiplier and let
// every Text/TextInput inherit it once, at startup, instead of per component.

export const MAX_FONT_SCALE = 1.35;
export const MIN_FONT_SCALE = 0.9;

type ScalableDefaults = {
  defaultProps?: {
    allowFontScaling?: boolean;
    maxFontSizeMultiplier?: number;
    [key: string]: unknown;
  };
};

/**
 * Applies app-wide dynamic type defaults. Called once from App before the first
 * render so that no screen needs to repeat these props.
 */
export function enableDynamicType(): void {
  for (const component of [Text, TextInput]) {
    const scalable = component as unknown as ScalableDefaults;
    scalable.defaultProps = {
      ...(scalable.defaultProps ?? {}),
      allowFontScaling: true,
      maxFontSizeMultiplier: MAX_FONT_SCALE,
    };
  }
}

/** The effective font scale, clamped to the range the layout supports. */
export function fontScale(): number {
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, PixelRatio.getFontScale()));
}
