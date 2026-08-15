import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Location from "expo-location";
import { useIsFocused } from "@react-navigation/native";
import type { Point } from "../../core/contracts";
import { haversineDistance } from "../../core/geo";
import { reportError } from "../../core/observability";

// ---------------------------------------------------------------------------
// Location watching.
//
// The screen used to take a single one-shot fix, so the blue dot froze at the
// position the passenger had when the screen mounted. It now subscribes to a
// live stream, with two tiers:
//
//   PRECISE  - only while the pickup point is still being decided (no pickup
//              yet, or the passenger is dragging the pin onto one). GPS runs at
//              full accuracy because a 50 m error here sends the driver to the
//              wrong side of the street.
//   COARSE   - everything after that. The dot only has to stay believable, so
//              the radio can rest and the battery lasts.
//
// The subscription is torn down whenever the screen loses focus or the app goes
// to the background, which is what actually protects the battery: an unattended
// GPS stream is the single most expensive thing a ride-hailing app can leave
// running.
// ---------------------------------------------------------------------------
export const PRECISE_WATCH = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 5,
  timeInterval: 2_000,
} as const;
export const COARSE_WATCH = {
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 25,
  timeInterval: 10_000,
} as const;
// Ignore sub-8 m deltas: below that it is GPS noise, and re-rendering the map
// for noise is pure waste.
export const LOCATION_MIN_MOVE_M = 8;
// How far the camera has to drift from the passenger before the recentre
// button appears. 100 m ignores GPS jitter but reacts to a deliberate pan.
export const RECENTRE_THRESHOLD_M = 100;

export type UserLocation = {
  /** Latest accepted device fix, or null while it is still resolving. */
  deviceLocation: Point | null;
  locationDenied: boolean;
  /** True once the camera has been panned away from the passenger. */
  isFarFromMe: boolean;
  /** Retryable permission request + first fix. Owns the system dialog. */
  requestLocation: () => Promise<void>;
  /** One-shot read used when a fix is needed before the watch has produced one. */
  readCurrentPoint: (precise: boolean) => Promise<Point | null>;
  /** Feeds the settled camera centre back in, which drives `isFarFromMe`. */
  syncCameraDistance: (center: Point) => void;
};

/**
 * Everything the Home screen knows about where the passenger is.
 *
 * Extracted verbatim from HomeScreen: same states, same accuracy tiers, same
 * teardown rules. `precise` is the caller's answer to "is the pickup point
 * still being decided?", and `onFix` receives every accepted fix so the caller
 * can seed an empty pickup without this hook knowing what a pickup is.
 */
export function useUserLocation({
  precise,
  onFix,
}: {
  precise: boolean;
  onFix?: (point: Point) => void;
}): UserLocation {
  // The device position stays available as the FIRST suggestion ("my current
  // location") - it is never forced as the pickup point.
  const [deviceLocation, setDeviceLocation] = useState<Point | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [isFarFromMe, setIsFarFromMe] = useState(false);

  // Kept in a ref so a caller passing an inline arrow can never restart the
  // GPS subscription on every render.
  const onFixRef = useRef(onFix);
  useEffect(() => {
    onFixRef.current = onFix;
  }, [onFix]);

  // Asking for the location is retryable: the illustration screen calls this
  // again when the passenger taps "allow", so a first refusal is not final.
  const requestLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationDenied(true);
        return;
      }
      // First fix decides the pickup point, so it is taken at full accuracy.
      // The live watch below drops to Balanced once pickup is settled.
      const position = await Location.getCurrentPositionAsync({
        accuracy: PRECISE_WATCH.accuracy,
      });
      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setLocationDenied(false);
      setDeviceLocation(point);
      onFixRef.current?.(point);
    } catch (e) {
      reportError(e, "home.location");
      setLocationDenied(true);
    }
  }, []);

  const readCurrentPoint = useCallback(async (highAccuracy: boolean) => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: highAccuracy ? PRECISE_WATCH.accuracy : COARSE_WATCH.accuracy,
      });
      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setDeviceLocation(point);
      return point;
    } catch (e) {
      reportError(e, "home.location.current");
      return null;
    }
  }, []);

  // Read through a ref, not through the closure: if this callback changed
  // identity on every accepted fix it would invalidate <RideMap/>'s memo and
  // re-render the map every few metres. Same computation, stable identity.
  const deviceLocationRef = useRef<Point | null>(null);
  useEffect(() => {
    deviceLocationRef.current = deviceLocation;
  }, [deviceLocation]);

  const syncCameraDistance = useCallback((center: Point) => {
    const me = deviceLocationRef.current;
    if (!me) return;
    setIsFarFromMe(haversineDistance(center, me) > RECENTRE_THRESHOLD_M);
  }, []);

  // Foreground/background tracking gate. `useIsFocused` covers navigation away
  // from the map, `AppState` covers the passenger leaving the app entirely.
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(true);
  useEffect(() => {
    const onAppState = (next: AppStateStatus) =>
      setAppActive(next === "active");
    const subscription = AppState.addEventListener("change", onAppState);
    return () => subscription.remove();
  }, []);

  // High accuracy is spent only while the pickup point is still undecided.
  const watchOptions = precise ? PRECISE_WATCH : COARSE_WATCH;

  const lastFixRef = useRef<Point | null>(null);
  useEffect(() => {
    if (!isFocused || !appActive || locationDenied) return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    void (async () => {
      try {
        // Never prompts: the permission dialog stays owned by
        // `requestLocation`, so the watch silently stays off until granted.
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== "granted" || cancelled) return;
        subscription = await Location.watchPositionAsync(
          watchOptions,
          (position) => {
            const point = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            const previous = lastFixRef.current;
            if (
              previous &&
              haversineDistance(previous, point) < LOCATION_MIN_MOVE_M
            ) {
              return;
            }
            lastFixRef.current = point;
            setDeviceLocation(point);
            // Same rule as the one-shot fix: only seeds an empty pickup, never
            // overwrites a point the passenger already chose.
            onFixRef.current?.(point);
          },
        );
        if (cancelled) {
          subscription.remove();
          subscription = null;
        }
      } catch (e) {
        reportError(e, "home.location.watch");
      }
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
      subscription = null;
    };
  }, [isFocused, appActive, locationDenied, watchOptions]);

  return {
    deviceLocation,
    locationDenied,
    isFarFromMe,
    requestLocation,
    readCurrentPoint,
    syncCameraDistance,
  };
}
