import React, { useEffect } from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./navigation/RootNavigator";
import { useSession } from "./core/session-store";
import { syncManagedAssets } from "./core/assets";
import {
  initializeObservability,
  reportError,
  setObservabilityUser,
} from "./core/observability";
import { registerNotifications } from "./core/notifications";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { useBrandFonts } from "./core/fonts";
import { enableDynamicType } from "./core/text-scale";

// The OS font-size setting must work everywhere, capped so pills and map cards
// never clip. Applied at module scope: before any screen renders.
enableDynamicType();

const client = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => reportError(error, "react-query"),
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 86_400_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
export default function App() {
  // Brand typeface: the UI renders immediately and swaps to it when ready.
  useBrandFonts();
  const restore = useSession((state) => state.restore);
  const userId = useSession((state) => state.session?.userId ?? null);
  useEffect(() => {
    void initializeObservability().catch(() => undefined);
    void Promise.allSettled([restore(), syncManagedAssets()]).then(
      (results) => {
        for (const result of results)
          if (result.status === "rejected")
            reportError(result.reason, "startup");
      },
    );
  }, [restore]);
  useEffect(() => {
    void setObservabilityUser(userId);
    if (!userId) return;
    let cleanup: (() => void) | undefined;
    let disposed = false;
    void registerNotifications()
      .then((close) => {
        if (disposed) close();
        else cleanup = close;
      })
      .catch((error) => reportError(error, "notifications.register"));
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [userId]);
  // GestureHandlerRootView must wrap the whole app (index.js already imports
  // react-native-gesture-handler): @react-navigation/native-stack +
  // react-native-screens rely on it, and without it on Android gesture-driven
  // touch handling (button presses, back gestures) is unreliable, which looked
  // like "buttons do nothing / navigation frozen". SafeAreaProvider is required
  // because ~20 screens read insets via SafeAreaView from
  // react-native-safe-area-context; without the provider those insets never
  // resolve and content can be pushed off-screen / collapsed.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppErrorBoundary>
          <QueryClientProvider client={client}>
            <RootNavigator />
          </QueryClientProvider>
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
