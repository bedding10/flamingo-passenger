import { cache } from "./storage";
import { api } from "./api";
import { reportError } from "./observability";
import { fallbackFor, humanizeKey } from "./i18n-fallback";
import type { Locale, TranslationBundle } from "./contracts";

const LOCALE_KEY = "app.locale";
const k = (l: Locale) => `i18n.${l}`;

// The bundled fallback for the locale that was most recently loaded. tr() uses
// it as a last resort so labels stay consistent with the active UI language.
let activeFallback: Record<string, string> = fallbackFor(storedLocale());

function storedLocale(): Locale {
  const saved = cache.getString(LOCALE_KEY);
  return saved === "fr" || saved === "en" || saved === "ar" ? saved : "ar";
}

// Merge remote strings on top of the bundled fallback for the SAME locale so a
// partial or stale remote bundle can never blank-out the UI. Remote wins per key.
function merge(
  locale: Locale,
  remote?: Record<string, string>,
): Record<string, string> {
  return { ...fallbackFor(locale), ...(remote ?? {}) };
}

export async function loadTranslations(
  locale: Locale = storedLocale(),
): Promise<Record<string, string>> {
  activeFallback = fallbackFor(locale);
  const raw = cache.getString(k(locale));
  const saved = raw
    ? (JSON.parse(raw) as { version: number; messages: Record<string, string> })
    : undefined;
  try {
    const { data } = await api.get<TranslationBundle>(
      `/translations/public/${locale}`,
      { params: saved ? { knownVersion: saved.version } : undefined },
    );
    if (!data.notModified && data.messages) {
      cache.set(
        k(locale),
        JSON.stringify({ version: data.version, messages: data.messages }),
      );
      return merge(locale, data.messages);
    }
    if (saved) return merge(locale, saved.messages);
  } catch (error) {
    // Never throw: a translations outage must not blank the app. Log it and
    // fall back to cached-or-bundled strings.
    reportError(error, "i18n.load");
    if (saved) return merge(locale, saved.messages);
  }
  // Nothing remote and nothing cached -> bundled fallback keeps the UI legible.
  return merge(locale);
}

// tr() must NEVER return an empty string. Order: remote/cached bundle -> bundled
// fallback for the active locale -> humanised key.
export function tr(messages: Record<string, string>, key: string) {
  const fromRemote = messages[key];
  if (fromRemote != null && fromRemote !== "") return fromRemote;
  const fromFallback = activeFallback[key];
  if (fromFallback != null && fromFallback !== "") return fromFallback;
  return humanizeKey(key);
}
