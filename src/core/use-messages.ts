import { useEffect, useState } from "react";
import { loadTranslations } from "./i18n";
import { useSession } from "./session-store";

export function useMessages() {
  const locale = useSession((state) => state.profile?.locale ?? "ar");
  const [messages, setMessages] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    loadTranslations(locale)
      .then((next) => {
        if (active) setMessages(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [locale]);
  return { locale, messages };
}
