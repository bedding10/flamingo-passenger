import {
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  Cairo_900Black,
} from "@expo-google-fonts/cairo";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
  useFonts,
} from "@expo-google-fonts/poppins";

// Brand typefaces, one per script:
//   Latin  -> Poppins (heavy, geometric, matches the reference design)
//   Arabic -> Cairo   (same personality, and unlike the Android system face it
//                      ships REAL 800 / 900 cuts, so Arabic headlines are as
//                      heavy as their Latin counterparts)
//
// NEVER apply a family directly to a <Text>. Use `useLatinType()` /
// `latinTypeFor()` from `./typeface`: they pick the right script automatically.
export const FONT = {
  medium: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  extraBold: "Poppins_800ExtraBold",
  /** Huge banner headlines only. */
  black: "Poppins_900Black",
} as const;

export const ARABIC_FONT = {
  medium: "Cairo_600SemiBold",
  bold: "Cairo_700Bold",
  extraBold: "Cairo_800ExtraBold",
  /** Huge banner headlines only. */
  black: "Cairo_900Black",
} as const;

export type FontWeightKey = keyof typeof FONT;

/**
 * Loads both brand typefaces. Returns true as soon as the app may render: the
 * fonts are not blocking, the UI simply swaps to them when they are ready, so
 * cold start never waits on font decoding.
 */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
    Cairo_900Black,
  });
  return loaded || error != null;
}
