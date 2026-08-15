import {
  getMessaging,
  requestPermission,
  registerDeviceForRemoteMessages,
  getToken,
  onTokenRefresh,
  deleteToken,
  getInitialNotification,
  onMessage,
  onNotificationOpenedApp,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";
import { api } from "./api";
import { navigateWhenReady } from "../navigation/navigation-ref";

/**
 * Routes a tapped push to the screen it is about.
 *
 * Contract owned by the server's NotificationDispatcher: trip messages carry
 * `data.type = "TRIP_MESSAGE"` and `data.tripId`. The test is on `data`, never
 * on the title text, so re-wording the copy cannot break navigation.
 *
 * Unknown types are ignored deliberately - simply opening the app is the right
 * behaviour for a notification this build does not understand.
 */
function routeFromData(data?: Record<string, unknown> | null) {
  if (!data || data.type !== "TRIP_MESSAGE") return;
  const tripId = typeof data.tripId === "string" ? data.tripId : null;
  if (!tripId) return;
  navigateWhenReady("TripCommunication", { tripId });
}

async function permissionGranted() {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    return (
      (await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS!,
      )) === PermissionsAndroid.RESULTS.GRANTED
    );
  }
  const status = await requestPermission(getMessaging());
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}
async function saveToken(token: string) {
  await api.post("/notifications/devices", { token, platform: Platform.OS });
}
export async function registerNotifications() {
  if (!(await permissionGranted())) return () => undefined;
  const messaging = getMessaging();
  await registerDeviceForRemoteMessages(messaging);
  await saveToken(await getToken(messaging));

  const detachRefresh = onTokenRefresh(messaging, (token) => {
    void saveToken(token).catch(() => undefined);
  });

  // Foreground: the OS displays nothing on either platform. The chat screen is
  // already live over the socket, so this stays silent on purpose and only
  // exists so RNFB does not warn about an unhandled foreground message.
  const detachForeground = onMessage(messaging, async () => undefined);

  // Tapped while backgrounded.
  const detachOpened = onNotificationOpenedApp(messaging, (message) => {
    routeFromData(message?.data as Record<string, unknown> | undefined);
  });

  // Tapped while killed: the notification that launched the process can only
  // be read here, and only once.
  void getInitialNotification(messaging)
    .then((initial) => {
      if (initial)
        routeFromData(initial.data as Record<string, unknown> | undefined);
    })
    .catch(() => undefined);

  // One disposer, because App.tsx stores a single cleanup function.
  return () => {
    detachRefresh();
    detachForeground();
    detachOpened();
  };
}
export async function unregisterNotifications() {
  const messaging = getMessaging();
  const token = await getToken(messaging).catch(() => null);
  if (token)
    await api
      .delete(`/notifications/devices/${encodeURIComponent(token)}`)
      .catch(() => undefined);
  await deleteToken(messaging).catch(() => undefined);
}
