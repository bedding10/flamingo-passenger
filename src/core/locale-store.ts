import { create } from "zustand";
import { cache } from "./storage";
import { loadTranslations } from "./i18n";
import { fallbackFor } from "./i18n-fallback";
import type { Locale } from "./contracts";

// Persisted app language, chosen by the user via the flag switcher on the auth
// screen. It drives the TEXT only.
//
// Layout direction is not a language setting and is not a system setting
// either: the interface structure is written out explicitly in the stylesheets
// and never moves. `I18nManager` is deliberately untouched anywhere in the app,
// so `I18nManager.isRTL` stays false and Yoga never mirrors anything behind our
// back. Switching to French or English swaps the copy and re-aligns TEXT only
// (see `useTextDirection`) - no structural flip, no reload, no restart.
export const LOCALE_KEY = "app.locale";
export const SUPPORTED_LOCALES: Locale[] = ["ar", "fr", "en"];

/**
 * Reads the persisted locale synchronously, before the store is created, so the
 * very first frame already renders in the right language.
 */
export function readSavedLocale(): Locale {
  try {
    const saved = cache.getString(LOCALE_KEY) as Locale | undefined;
    return saved && SUPPORTED_LOCALES.includes(saved) ? saved : "ar";
  } catch {
    // MMKV unavailable (very early boot / test env): Arabic is the default.
    return "ar";
  }
}

function initialLocale(): Locale {
  return readSavedLocale();
}

type LocaleState = {
  locale: Locale;
  messages: Record<string, string>;
  loadedLocale: Locale | null;
  // Loads the remote-merged bundle for the current locale (once per locale).
  hydrate: () => Promise<void>;
  // Switches language: persists the choice, swaps the bundled strings
  // immediately and merges the remote bundle on top. No reload, ever: the
  // structure is fixed and only text alignment reacts, at render time.
  setLocale: (locale: Locale) => Promise<void>;
};

export const useLocaleStore = create<LocaleState>()((set, get) => ({
  locale: initialLocale(),
  // Seed with the bundled strings so text is legible on the very first frame.
  messages: fallbackFor(initialLocale()),
  loadedLocale: null,
  hydrate: async () => {
    const { locale, loadedLocale } = get();
    if (loadedLocale === locale) return;
    const messages = await loadTranslations(locale);
    set({ messages, loadedLocale: locale });
  },
  setLocale: async (locale) => {
    if (get().locale === locale) return;
    cache.set(LOCALE_KEY, locale);
    set({ locale, messages: fallbackFor(locale), loadedLocale: null });
    const messages = await loadTranslations(locale);
    set({ messages, loadedLocale: locale });
    // Nothing else to do: the structure never moves, only the strings and
    // their alignment changed, and both are plain React state.
  },
}));
