// Bundled fallback translations for the app's PRIMARY (main) strings.
//
// These ship inside the app for the three supported locales (ar / fr / en) so
// the core UI is ALWAYS legible instantly — offline and before the remote
// translation bundle arrives. Secondary / less-frequent strings are still
// fetched from the backend and merged on top (remote wins per key).
//
// The three dictionaries used to sit in this one 1300-line module, so every
// launch parsed and kept ALL of them in memory even though a passenger only
// ever reads one. They now live in ./i18n-locales/<locale>.ts and are pulled in
// lazily, on first use, through Metro's inline require. The exported API is
// unchanged and still synchronous, so no caller had to change.
//
// Default app locale is Arabic.

import type { Locale } from "./contracts";

type Bundle = Record<string, string>;

// Inline requires: the module body is only evaluated the first time the
// matching locale is actually asked for.
const LOADERS: Record<Locale, () => Bundle> = {
  ar: () => (require("./i18n-locales/ar") as { default: Bundle }).default,
  fr: () => (require("./i18n-locales/fr") as { default: Bundle }).default,
  en: () => (require("./i18n-locales/en") as { default: Bundle }).default,
};

// Once loaded a bundle stays in memory: it is the same object every caller
// receives, so React sees a stable reference and never re-renders for it.
const loaded: Partial<Record<Locale, Bundle>> = {};

export function fallbackFor(locale: Locale): Bundle {
  const cached = loaded[locale];
  if (cached) return cached;
  const load = LOADERS[locale] ?? LOADERS.ar;
  const bundle = load();
  loaded[locale] = bundle;
  return bundle;
}

// Last-resort humaniser so an unknown key still renders something legible
// instead of an empty string. "trip.status.IN_PROGRESS" -> "In Progress".
export function humanizeKey(key: string): string {
  const last = key.split(".").pop() ?? key;
  if (/^[A-Z0-9_]+$/.test(last)) {
    return last
      .split("_")
      .filter(Boolean)
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
