import crashlytics from "@react-native-firebase/crashlytics";
import perf from "@react-native-firebase/perf";
import * as Application from "expo-application";
import * as Device from "expo-device";

export async function initializeObservability() {
  const enabled = !__DEV__;
  await Promise.all([
    crashlytics().setCrashlyticsCollectionEnabled(enabled),
    perf().setPerformanceCollectionEnabled(enabled),
  ]);
  if (enabled) {
    await crashlytics().setAttributes({
      appVersion: Application.nativeApplicationVersion ?? "unknown",
      buildVersion: Application.nativeBuildVersion ?? "unknown",
      platformDevice:
        Device.deviceType == null ? "unknown" : String(Device.deviceType),
    });
  }
}

export function reportError(error: unknown, context: string) {
  if (__DEV__) return;
  const safe =
    error instanceof Error
      ? new Error(error.message)
      : new Error("UNKNOWN_ERROR");
  crashlytics().log(context.slice(0, 120));
  crashlytics().recordError(safe);
}

export async function setObservabilityUser(userId: string | null) {
  if (__DEV__) return;
  await crashlytics().setUserId(userId ?? "");
}
