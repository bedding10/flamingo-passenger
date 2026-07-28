import {
  getCrashlytics,
  setCrashlyticsCollectionEnabled,
  setAttributes,
  log,
  recordError,
  setUserId,
} from "@react-native-firebase/crashlytics";
import * as Application from "expo-application";
import * as Device from "expo-device";

// Firebase Performance Monitoring was removed: it shipped a full extra native
// SDK (~1-2 MB) and installed method-trace instrumentation on every startup,
// while Crashlytics already covers the signal we act on. Startup and screen
// timings are tracked from the backend metrics pipeline instead.

export async function initializeObservability() {
  const enabled = !__DEV__;
  const crashlytics = getCrashlytics();
  await setCrashlyticsCollectionEnabled(crashlytics, enabled);
  if (enabled) {
    await setAttributes(crashlytics, {
      appVersion: Application.nativeApplicationVersion ?? "unknown",
      buildVersion: Application.nativeBuildVersion ?? "unknown",
      platformDevice:
        Device.deviceType == null ? "unknown" : String(Device.deviceType),
    });
  }
}

export function reportError(error: unknown, context: string) {
  if (__DEV__) return;
  const crashlytics = getCrashlytics();
  const safe =
    error instanceof Error
      ? new Error(error.message)
      : new Error("UNKNOWN_ERROR");
  log(crashlytics, context.slice(0, 120));
  recordError(crashlytics, safe);
}

export async function setObservabilityUser(userId: string | null) {
  if (__DEV__) return;
  await setUserId(getCrashlytics(), userId ?? "");
}
