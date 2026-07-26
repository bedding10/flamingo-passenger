import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";

// Brand typeface. Latin text uses Plus Jakarta Sans; Arabic keeps the system
// face (which renders Arabic correctly and costs nothing to bundle).
export const FONT = {
  medium: "PlusJakartaSans_500Medium",
  bold: "PlusJakartaSans_700Bold",
  extraBold: "PlusJakartaSans_800ExtraBold",
} as const;

/**
 * Loads the brand typeface. Returns true as soon as the app may render: the
 * fonts are not blocking, the UI simply swaps to them when they are ready, so
 * cold start never waits on font decoding.
 */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  return loaded || error != null;
}
