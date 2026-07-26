import React, { Suspense, lazy, type ComponentType } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "../core/theme-store";

// Lazy screens: only the map, the menu and authentication are part of the first
// JavaScript bundle evaluation. Everything else (wallet, coupons, legal, help,
// history...) is required the first time the user opens it, which shortens cold
// start and keeps memory low on entry-level devices.

function ScreenFallback() {
  const { palette } = useTheme();
  return (
    <View style={[styles.fallback, { backgroundColor: palette.bg }]}>
      <ActivityIndicator color={palette.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: "center", justifyContent: "center" },
});

/**
 * Wraps a dynamically imported screen in a Suspense boundary so it can be used
 * directly as a navigator `component`.
 *
 * @example
 * const Wallet = lazyScreen(() =>
 *   import("../features/services/FinanceScreens").then((m) => m.WalletScreen),
 * );
 */
export function lazyScreen<P extends object>(
  loader: () => Promise<ComponentType<P>>,
): ComponentType<P> {
  const Loaded = lazy(async () => ({ default: await loader() }));
  function LazyScreen(props: P) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <Loaded {...props} />
      </Suspense>
    );
  }
  return LazyScreen as ComponentType<P>;
}
