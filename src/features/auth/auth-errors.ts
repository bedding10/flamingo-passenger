// ---------------------------------------------------------------------------
// Auth error \u2192 translation key.
//
// Two very different failure sources meet on the sign-in screen:
//
//   1. The backend, which answers with the documented envelope
//      { code, message, details, requestId } \u2014 handled by toApiError().
//   2. Firebase Phone Auth, which throws its own `auth/...` codes client-side
//      and never reaches our server at all.
//
// Until now BOTH were flattened into "common.error" (\u0623\u064a \u062e\u0637\u0623 \u062d\u062f\u062b), so a wrong
// password, a locked account, an expired SMS code and a dead radio all looked
// identical to the passenger. This module maps each one onto a specific key.
//
// No endpoint is added and no server behaviour is assumed: every code below is
// one the backend already emits (api-error.util.ts) or one Firebase documents.
// ---------------------------------------------------------------------------
import { toApiError } from "../../core/api-error";

/** Firebase Auth codes the phone flow can realistically produce. */
const FIREBASE_KEYS: Record<string, string> = {
  "auth/invalid-phone-number": "error.firebase.invalidPhone",
  "auth/missing-phone-number": "error.firebase.invalidPhone",
  "auth/too-many-requests": "error.firebase.tooManyRequests",
  "auth/quota-exceeded": "error.firebase.tooManyRequests",
  "auth/network-request-failed": "error.offline",
  "auth/invalid-verification-code": "error.firebase.invalidCode",
  "auth/invalid-verification-id": "error.firebase.expiredCode",
  "auth/code-expired": "error.firebase.expiredCode",
  "auth/session-expired": "error.firebase.expiredCode",
  "auth/user-disabled": "error.ACCOUNT_INACTIVE",
  // Region not enabled / provider disabled: the SMS will never arrive, so the
  // passenger has to be told instead of being left on the code screen.
  "auth/operation-not-allowed": "error.firebase.smsUnavailable",
  "auth/unknown": "error.firebase.smsUnavailable",
};

/** Locally thrown sentinels (normalizeE164, confirmPhone, email link). */
const LOCAL_KEYS: Record<string, string> = {
  INVALID_PHONE: "error.firebase.invalidPhone",
  OTP_FAILED: "error.firebase.invalidCode",
  NO_CONFIRMATION: "error.firebase.expiredCode",
  EMAIL_REQUIRED: "error.VALIDATION_ERROR",
  EMAIL_LINK_ADDRESS_MISSING: "error.firebase.expiredCode",
  FIREBASE_EMAIL_LINK_DISABLED: "error.firebase.smsUnavailable",
};

function readCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function readMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) return "";
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

/**
 * True when the failure came from Firebase rather than from our API. This is
 * what the fallback logic keys on: a server rejection must NOT be retried over
 * a different channel, only a Firebase-side failure may be.
 */
export function isFirebaseFailure(error: unknown): boolean {
  const code = readCode(error);
  if (code && (code.startsWith("auth/") || code in LOCAL_KEYS)) return true;
  // react-native-firebase surfaces the native numeric code inside the message
  // for a few cases, notably 17006 ("SMS unable to be sent until this region
  // is enabled").
  return /\b170\d\d\b/.test(readMessage(error));
}

/**
 * Resolves any thrown value into a translation key that always exists.
 * Server envelope first (it is the source of truth), Firebase second.
 */
export function authErrorKey(error: unknown): string {
  const code = readCode(error);
  if (code) {
    const firebaseKey = FIREBASE_KEYS[code] ?? LOCAL_KEYS[code];
    if (firebaseKey) return firebaseKey;
  }
  // Firebase sometimes only carries the numeric native code in the message.
  if (/\b17006\b|\b17010\b/.test(readMessage(error)))
    return /\b17010\b/.test(readMessage(error))
      ? "error.firebase.tooManyRequests"
      : "error.firebase.smsUnavailable";
  if (error instanceof Error && LOCAL_KEYS[error.message])
    return LOCAL_KEYS[error.message] as string;
  // Anything else is (or behaves like) an API failure.
  return toApiError(error).messageKey;
}
