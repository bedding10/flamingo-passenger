import { cache } from "./storage";
import { api } from "./api";
import type { Locale, TranslationBundle } from "./contracts";
const k = (l: Locale) => `i18n.${l}`;
export async function loadTranslations(locale: Locale) {
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
      return data.messages;
    }
    if (saved) return saved.messages;
  } catch (error) {
    if (saved) return saved.messages;
    throw error;
  }
  throw Error("TRANSLATIONS_UNAVAILABLE");
}
export function tr(messages: Record<string, string>, key: string) {
  return messages[key] ?? "";
}
