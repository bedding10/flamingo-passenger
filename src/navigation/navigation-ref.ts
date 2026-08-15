import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

/**
 * Navigation handle for code that runs outside React.
 *
 * core/notifications.ts needs to open a screen when a push is tapped, and that
 * handler can fire before any component has mounted (cold start from a killed
 * app). A ref is the only way to reach the navigator from there.
 *
 * This is NOT a second navigation system: RootNavigator still owns the single
 * NavigationContainer, this only points at it.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * A cold start delivers the tapped push before mount, so the target is parked
 * here and replayed by RootNavigator on ready. Only the last tap is kept.
 */
let pending: { name: keyof RootStackParamList; params?: object } | null = null;

export function navigateWhenReady<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name],
): void {
  if (navigationRef.isReady()) {
    // @ts-expect-error - the name/params pair is correct at every call site;
    // the ref overloads cannot express that relation through this wrapper.
    navigationRef.navigate(name, params);
    return;
  }
  pending = { name, params: params as object | undefined };
}

/** Called by RootNavigator once the container reports ready. */
export function flushPendingNavigation(): void {
  if (!pending || !navigationRef.isReady()) return;
  const target = pending;
  pending = null;
  // @ts-expect-error - see navigateWhenReady.
  navigationRef.navigate(target.name, target.params);
}
