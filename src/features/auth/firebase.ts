import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import * as SecureStore from "expo-secure-store";
import { api } from "../../core/api";
import type { Session } from "../../core/contracts";

const PENDING_EMAIL_KEY = "auth.pendingEmailLink";
type PublicConfig = {
  settings?: {
    "auth.firebaseEmailLink"?: {
      enabled?: boolean;
      url: string;
      iOS?: { bundleId: string };
      android?: {
        packageName: string;
        installApp?: boolean;
        minimumVersion?: string;
      };
    };
  };
};
export async function requestPhone(phone: string) {
  return auth().signInWithPhoneNumber(phone.trim());
}
export async function confirmPhone(
  confirmation: FirebaseAuthTypes.ConfirmationResult,
  code: string,
) {
  const credential = await confirmation.confirm(code.trim());
  if (!credential) throw Error("OTP_FAILED");
  return exchange(await credential.user.getIdToken(true));
}
export async function exchange(idToken: string) {
  const { data } = await api.post<Session>("/auth/firebase", {
    idToken,
    role: "PASSENGER",
  });
  return data;
}
export async function sendEmailLink(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw Error("EMAIL_REQUIRED");
  const { data } = await api.get<PublicConfig>("/public/config");
  const configured = data.settings?.["auth.firebaseEmailLink"];
  if (!configured?.enabled || !configured.url)
    throw Error("FIREBASE_EMAIL_LINK_DISABLED");
  const settings: FirebaseAuthTypes.ActionCodeSettings = {
    url: configured.url,
    handleCodeInApp: true,
    iOS: configured.iOS,
    android: configured.android,
  };
  await auth().sendSignInLinkToEmail(normalized, settings);
  await SecureStore.setItemAsync(PENDING_EMAIL_KEY, normalized, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}
export async function completeEmailLink(url: string) {
  if (!auth().isSignInWithEmailLink(url)) return null;
  const email = await SecureStore.getItemAsync(PENDING_EMAIL_KEY);
  if (!email) throw Error("EMAIL_LINK_ADDRESS_MISSING");
  const credential = await auth().signInWithEmailLink(email, url);
  await SecureStore.deleteItemAsync(PENDING_EMAIL_KEY);
  return exchange(await credential.user.getIdToken(true));
}
