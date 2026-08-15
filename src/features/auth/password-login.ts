// ---------------------------------------------------------------------------
// Daily sign-in: phone number + password.
//
// This is not a second auth system. It calls the endpoint the backend has
// always exposed, POST /auth/login (AuthService.login -> bcrypt.compare plus
// LoginThrottleService), and returns the same Session shape the Firebase
// exchange returns, so `useSession.accept()` treats both identically.
//
// Firebase Phone Auth stays in charge of first registration, account recovery
// and security re-checks; the password only removes the daily SMS.
// ---------------------------------------------------------------------------
import { api } from "../../core/api"
import type { Session } from "../../core/contracts"
import { normalizeE164 } from "./firebase"

/** Country used when the passenger types a national number (Algeria). */
const DEFAULT_COUNTRY = "DZ"

export async function loginWithPassword(
  phone: string,
  password: string,
): Promise<Session> {
  // The server normalises phone numbers too (CountryConfigService), but sending
  // E.164 keeps the client and the server looking up the exact same record.
  const { data } = await api.post<Session>("/auth/login", {
    phone: normalizeE164(phone),
    countryCode: DEFAULT_COUNTRY,
    password,
  })
  return data
}
