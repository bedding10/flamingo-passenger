import {
  getMessaging,
  requestPermission,
  registerDeviceForRemoteMessages,
  getToken,
  onTokenRefresh,
  deleteToken,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";
import { api } from "./api";

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
  return onTokenRefresh(messaging, (token) => {
    void saveToken(token).catch(() => undefined);
  });
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
