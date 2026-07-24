import {
  getAuth,
  signInWithPhoneNumber as signInWithPhoneNumberModular,
  sendSignInLinkToEmail as sendSignInLinkToEmailModular,
  isSignInWithEmailLink as isSignInWithEmailLinkModular,
  signInWithEmailLink as signInWithEmailLinkModular,
  signInWithCredential,
  getIdToken,
  GoogleAuthProvider,
  FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";
import { api } from "../../core/api";
import type { Session } from "../../core/contracts";

const PENDING_EMAIL_KEY = "auth.pendingEmailLink";

// Web OAuth client (client_type 3) taken from google-services.json. Google
// Sign-In must be configured with this so the ID token it returns is one that
// Firebase Authentication accepts.
const GOOGLE_WEB_CLIENT_ID =
  "863994471927-8g48232n9v7vfofo6rashk9f96alvbr9.apps.googleusercontent.com";

let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  googleConfigured = true;
}

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

// Firebase's SMS region policy matches on the COUNTRY parsed from the E.164
// number. If the number is not E.164 (no leading "+<country>"), Firebase cannot
// map it to Algeria (+213) and rejects with error 17006 ("SMS unable to be sent
// until this region enabled by the app developer") EVEN WHEN Algeria is
// allow-listed. normalizeE164 guarantees an E.164 number with an explicit
// country so the allow-list can actually match.
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
  return signInWithPhoneNumberModular(getAuth(), normalizeE164(phone));
}

export async function confirmPhone(
  confirmation: FirebaseAuthTypes.ConfirmationResult,
  code: string,
) {
  const credential = await confirmation.confirm(code.trim());
  if (!credential) throw Error("OTP_FAILED");
  return exchange(await getIdToken(credential.user, true));
}

export async function exchange(idToken: string) {
  const { data } = await api.post<Session>("/auth/firebase", {
    idToken,
    role: "PASSENGER",
  });
  return data;
}

// Opens the native Google account picker (lists every Google account already on
// the device), converts the chosen account's ID token into a Firebase
// credential, signs in, then exchanges the resulting Firebase ID token with the
// backend. No manual email entry, no email TextInput.
export async function signInWithGoogle() {
  ensureGoogleConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const googleIdToken =
    (response as { data?: { idToken?: string | null } }).data?.idToken ??
    (response as { idToken?: string | null }).idToken ??
    null;
  if (!googleIdToken) {
    if ((response as { type?: string }).type === "cancelled")
      throw Error("GOOGLE_SIGN_IN_CANCELLED");
    throw Error("GOOGLE_ID_TOKEN_MISSING");
  }
  const credential = GoogleAuthProvider.credential(googleIdToken);
  const result = await signInWithCredential(getAuth(), credential);
  return exchange(await getIdToken(result.user, true));
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
  await sendSignInLinkToEmailModular(getAuth(), normalized, settings);
  await SecureStore.setItemAsync(PENDING_EMAIL_KEY, normalized, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export async function completeEmailLink(url: string) {
  if (!isSignInWithEmailLinkModular(getAuth(), url)) return null;
  const email = await SecureStore.getItemAsync(PENDING_EMAIL_KEY);
  if (!email) throw Error("EMAIL_LINK_ADDRESS_MISSING");
  const credential = await signInWithEmailLinkModular(getAuth(), email, url);
  await SecureStore.deleteItemAsync(PENDING_EMAIL_KEY);
  return exchange(await getIdToken(credential.user, true));
}
