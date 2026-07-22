import React, { useEffect } from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
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
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={client}>
        <RootNavigator />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
