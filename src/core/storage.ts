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
