import messaging, {
  FirebaseMessagingTypes,
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
  const status = await messaging().requestPermission();
  return (
    status === FirebaseMessagingTypes.AuthorizationStatus.AUTHORIZED ||
    status === FirebaseMessagingTypes.AuthorizationStatus.PROVISIONAL
  );
}
async function saveToken(token: string) {
  await api.post("/notifications/devices", { token, platform: Platform.OS });
}
export async function registerNotifications() {
  if (!(await permissionGranted())) return () => undefined;
  await messaging().registerDeviceForRemoteMessages();
  await saveToken(await messaging().getToken());
  return messaging().onTokenRefresh((token) => {
    void saveToken(token).catch(() => undefined);
  });
}
export async function unregisterNotifications() {
  const token = await messaging()
    .getToken()
    .catch(() => null);
  if (token)
    await api
      .delete(`/notifications/devices/${encodeURIComponent(token)}`)
      .catch(() => undefined);
  await messaging()
    .deleteToken()
    .catch(() => undefined);
}
