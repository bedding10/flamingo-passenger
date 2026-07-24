import { cache } from "./storage";
import { api } from "./api";
import { reportError } from "./observability";
import { FALLBACK_MESSAGES, humanizeKey } from "./i18n-fallback";
import type { Locale, TranslationBundle } from "./contracts";
const k = (l: Locale) => `i18n.${l}`;

// Always merge remote strings on top of the bundled fallback so a partial or
// stale remote bundle can never blank-out the UI. Remote wins per-key.
function merge(remote?: Record<string, string>): Record<string, string> {
  return { ...FALLBACK_MESSAGES, ...(remote ?? {}) };
}

export async function loadTranslations(
  locale: Locale,
): Promise<Record<string, string>> {
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
      return merge(data.messages);
    }
    if (saved) return merge(saved.messages);
  } catch (error) {
    // Never throw: a translations outage must not blank the app. Log it (so it
    // is not a silent failure) and fall back to cached-or-bundled strings.
    reportError(error, "i18n.load");
    if (saved) return merge(saved.messages);
  }
  // Nothing remote and nothing cached -> bundled fallback keeps the UI legible.
  return merge();
}

// tr() must NEVER return an empty string. Order: remote/cached bundle -> bundled
// fallback -> humanised key. This is what guarantees text is always visible even
// before the network bundle arrives.
export function tr(messages: Record<string, string>, key: string) {
  const fromRemote = messages[key];
  if (fromRemote != null && fromRemote !== "") return fromRemote;
  const fromFallback = FALLBACK_MESSAGES[key];
  if (fromFallback != null && fromFallback !== "") return fromFallback;
  return humanizeKey(key);
}
