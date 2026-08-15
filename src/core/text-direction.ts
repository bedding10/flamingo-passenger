import { useMemo } from "react";
import type { TextStyle } from "react-native";
import { useLocaleStore } from "./locale-store";

/**
 * Text direction, and ONLY text direction.
 *
 * The app never calls `I18nManager.forceRTL()`, so `I18nManager.isRTL` is
 * always false and Yoga mirrors nothing. The structure of the interface (drawer
 * on the right, hamburger on the right, the direction of every icon row) is
 * written out explicitly in the stylesheets and stays put in every language.
 *
 * What DOES follow the language is the way words are laid out inside a `Text`
 * or a `TextInput`: Arabic reads right-to-left, French and English read
 * left-to-right. That is a pure render-time concern, so switching language is
 * just a state change - no reload, no restart, no flash.
 *
 *   const { textAlign, writingDirection } = useTextDirection()
 *   <Text style={[styles.title, { textAlign, writingDirection }]}>{title}</Text>
 */
export type TextDirection = {
  /** True when the ACTIVE LANGUAGE is written right-to-left (Arabic). */
  isRTLText: boolean;
  textAlign: TextStyle["textAlign"];
  writingDirection: TextStyle["writingDirection"];
};

/** Pure helper, usable outside React (StyleSheet factories, tests). */
export function textDirectionFor(locale: string): TextDirection {
  const isRTLText = locale === "ar";
  return {
    isRTLText,
    textAlign: isRTLText ? "right" : "left",
    writingDirection: isRTLText ? "rtl" : "ltr",
  };
}

export function useTextDirection(): TextDirection {
  const locale = useLocaleStore((state) => state.locale);
  return useMemo(() => textDirectionFor(locale), [locale]);
}
