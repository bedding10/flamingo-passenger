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
// Firebase's SMS region policy matches on the COUNTRY of the phone number as
// parsed from E.164. If the number is not in E.164 (no leading "+<country>"),
// Firebase cannot map it to Algeria (+213) and rejects with error 17006
// ("SMS unable to be sent until this region enabled by the app developer"),
// even when Algeria IS allow-listed. The old code sent the raw text verbatim,
// so a user typing a local number like "0555 12 34 56" was never recognised as
// +213. normalizeE164 guarantees an E.164 number with an explicit country.
export function normalizeE164(input: string, defaultCountry = "213"): string {
  const digitsAndPlus = input.replace(/[^\d+]/g, "");
  let value: string;
  if (digitsAndPlus.startsWith("+")) {
    value = digitsAndPlus;
  } else if (digitsAndPlus.startsWith("00")) {
    value = `+${digitsAndPlus.slice(2)}`;
  } else if (digitsAndPlus.startsWith(defaultCountry)) {
    value = `+${digitsAndPlus}`;
  } else if (digitsAndPlus.startsWith("0")) {
    // National trunk format (0 + subscriber number) -> +<country><subscriber>.
    value = `+${defaultCountry}${digitsAndPlus.slice(1)}`;
  } else {
    // Bare national subscriber number (e.g. "555123456").
    value = `+${defaultCountry}${digitsAndPlus}`;
  }
  if (!/^\+\d{8,15}$/.test(value)) throw Error("INVALID_PHONE");
  return value;
}
export async function requestPhone(phone: string) {
  return auth().signInWithPhoneNumber(normalizeE164(phone));
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
