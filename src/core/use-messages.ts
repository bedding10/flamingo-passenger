import { useEffect } from "react";
import { useLocaleStore } from "./locale-store";

// Returns the active app locale and its merged (bundled + remote) messages.
// Language is driven by the user's choice in the flag switcher, persisted and
// shared across every screen via the locale store.
export function useMessages() {
  const locale = useLocaleStore((state) => state.locale);
  const messages = useLocaleStore((state) => state.messages);
  const hydrate = useLocaleStore((state) => state.hydrate);
  useEffect(() => {
    void hydrate();
  }, [locale, hydrate]);
  return { locale, messages };
}
