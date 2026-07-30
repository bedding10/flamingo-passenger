import * as SecureStore from "expo-secure-store";
import { MMKV } from "react-native-mmkv";
export const cache = new MMKV({ id: "flamingo-passenger-cache" });
const A = "session.access",
  R = "session.refresh";
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
export async function saveTokens(a: string, r: string) {
  await Promise.all([
    SecureStore.setItemAsync(A, a, secureOptions),
    SecureStore.setItemAsync(R, r, secureOptions),
  ]);
}
export async function tokens() {
  const [a, r] = await Promise.all([
    SecureStore.getItemAsync(A),
    SecureStore.getItemAsync(R),
  ]);
  return { access: a, refresh: r };
}
export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(A),
    SecureStore.deleteItemAsync(R),
  ]);
}
export async function saveSecureJson(key: string, value: unknown) {
  await SecureStore.setItemAsync(key, JSON.stringify(value), secureOptions);
}
export async function readSecureJson<T>(key: string): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; }
  catch { await SecureStore.deleteItemAsync(key); return null; }
}
export async function deleteSecureItems(...keys: string[]) {
  await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
}
