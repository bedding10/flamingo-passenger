import {
  getCrashlytics,
  setCrashlyticsCollectionEnabled,
  setAttributes,
  log,
  recordError,
  setUserId,
} from "@react-native-firebase/crashlytics";
import {
  getPerformance,
  setPerformanceCollectionEnabled,
} from "@react-native-firebase/perf";
import * as Application from "expo-application";
import * as Device from "expo-device";

export async function initializeObservability() {
  const enabled = !__DEV__;
  const crashlytics = getCrashlytics();
  await Promise.all([
    setCrashlyticsCollectionEnabled(crashlytics, enabled),
    setPerformanceCollectionEnabled(getPerformance(), enabled),
  ]);
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
