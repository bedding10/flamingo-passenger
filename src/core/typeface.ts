import { useMemo } from "react";
import type { TextStyle } from "react-native";
import { ARABIC_FONT, FONT, type FontWeightKey } from "./fonts";
import { useLocaleStore } from "./locale-store";
import { typography, type TypeToken } from "../design/theme";

// Poppins carries no Arabic glyphs, so Arabic text is rendered with Cairo,
// which has the same geometric personality AND real 800 / 900 cuts. The Android
// system face fakes those weights, which is why Arabic headlines used to look
// lighter than the Latin ones.
//
// This module is the ONLY place allowed to attach a `fontFamily`.

/** Which cut each type token uses. Same key in both scripts. */
const FACE_FOR_TOKEN: Record<TypeToken, FontWeightKey> = {
  banner: "black",
  display: "black",
  headline: "extraBold",
  menuItem: "extraBold",
  title: "bold",
  subtitle: "medium",
  body: "medium",
  caption: "medium",
};

const isArabic = (locale: string) => locale === "ar";
/** Every non-Arabic locale, i.e. everything rendered in Poppins. */
const isLatin = (locale: string) => !isArabic(locale);

// Latin words run longer than their Arabic equivalents in the same box, and
// Poppins reads lighter than Cairo at the same nominal weight. One notch
// heavier plus a slightly smaller size keeps French AND English readable
// without overflowing.
const LATIN_WEIGHT_BUMP: Partial<Record<FontWeightKey, FontWeightKey>> = {
  medium: "bold",
  bold: "extraBold",
  extraBold: "black",
};

/** Size scale-down applied to every Latin locale (French and English). */
const LATIN_SIZE_RATIO = 0.93;

/** Script-aware font family for a type token. */
export function latinTypeFor(
  token: TypeToken,
  locale: string,
): Pick<TextStyle, "fontFamily"> {
  const baseFace = FACE_FOR_TOKEN[token];
  const face = isLatin(locale)
    ? (LATIN_WEIGHT_BUMP[baseFace] ?? baseFace)
    : baseFace;
  return {
    fontFamily: isArabic(locale) ? ARABIC_FONT[face] : FONT[face],
  };
}

/**
 * Uppercase is a Latin-only concept: Arabic has no letter case, and applying
 * `textTransform: "uppercase"` to Arabic is a no-op that only risks breaking
 * shaping on some Android versions.
 */
export function latinUpperFor(locale: string): Pick<TextStyle, "textTransform"> {
  return isArabic(locale) ? {} : { textTransform: "uppercase" };
}

export type TypeStyler = (token: TypeToken, upper?: boolean) => TextStyle;

/**
 * Returns a styler that merges the type token with the correct family for the
 * active locale.
 *
 *   const type = useLatinType()
 *   <Text style={[type("banner", true), { color: colors.ink }]}>...</Text>
 */
export function useLatinType(): TypeStyler {
  const locale = useLocaleStore((state) => state.locale);
  return useMemo(
    () => (token: TypeToken, upper = false) => {
      const base = typography[token] as TextStyle;
      const latinSize =
        isLatin(locale) && typeof base.fontSize === "number"
          ? { fontSize: Math.round(base.fontSize * LATIN_SIZE_RATIO) }
          : {};
      return {
        ...base,
        ...latinSize,
        ...latinTypeFor(token, locale),
        ...(upper ? latinUpperFor(locale) : {}),
      };
    },
    [locale],
  );
}
