import { create } from "zustand";
import { cache } from "./storage";
import { loadTranslations } from "./i18n";
import { fallbackFor } from "./i18n-fallback";
import type { Locale } from "./contracts";

// Persisted app language, chosen by the user via the flag switcher on the auth
// screen. This is the single source of truth for the whole app's language.
export const LOCALE_KEY = "app.locale";
export const SUPPORTED_LOCALES: Locale[] = ["ar", "fr", "en"];
export const isRTLLocale = (locale: Locale) => locale === "ar";

function initialLocale(): Locale {
  const saved = cache.getString(LOCALE_KEY) as Locale | undefined;
  return saved && SUPPORTED_LOCALES.includes(saved) ? saved : "ar";
}

type LocaleState = {
  locale: Locale;
  messages: Record<string, string>;
  loadedLocale: Locale | null;
  // Loads the remote-merged bundle for the current locale (once per locale).
  hydrate: () => Promise<void>;
  // Switches language: persists the choice, swaps the bundled strings
  // immediately, then merges the remote bundle on top.
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
    // Language ONLY: never flip the app's layout direction when switching
    // language. The whole UI stays LTR regardless of locale.
    set({ locale, messages: fallbackFor(locale), loadedLocale: null });
    const messages = await loadTranslations(locale);
    set({ messages, loadedLocale: locale });
  },
}));
