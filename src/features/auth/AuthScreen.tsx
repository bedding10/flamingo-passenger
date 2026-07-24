import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { BrandModel } from "../../components/BrandModel";
import { syncManagedAssets } from "../../core/assets";
import { loadTranslations, tr } from "../../core/i18n";
import { reportError } from "../../core/observability";
import {
  completeEmailLink,
  confirmPhone,
  requestPhone,
  signInWithGoogle,
} from "./firebase";
import { useSession } from "../../core/session-store";

type Mode = "entry" | "phone" | "otp";
type Busy = null | "phone" | "otp" | "google";

export function AuthScreen() {
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("entry");
  const [confirmation, setConfirmation] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const accept = useSession((s) => s.accept);

  // Every auth action is async and network-bound. guard() disables the UI while
  // running and surfaces failures as a visible, logged error instead of a
  // silent no-op. A user-cancelled Google picker is not an error.
  const guard =
    (kind: Exclude<Busy, null>, fn: () => Promise<void>) => () => {
      if (busy) return;
      setError(null);
      setBusy(kind);
      void fn()
        .catch((e: unknown) => {
          const message = e instanceof Error ? e.message : "";
          if (message !== "GOOGLE_SIGN_IN_CANCELLED") {
            reportError(e, `auth.${kind}`);
            setError(tr(msg, "common.error"));
          }
        })
        .finally(() => setBusy(null));
    };

  useEffect(() => {
    loadTranslations("ar")
      .then(setMsg)
      .catch((e) => reportError(e, "auth.i18n"));
    syncManagedAssets()
      .then(() => setAssetsReady(true))
      .catch(() => setAssetsReady(true));
  }, []);

  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url) return;
      try {
        const session = await completeEmailLink(url);
        if (session) await accept(session);
      } catch (e) {
        reportError(e, "auth.emailLink");
      }
    };
    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", (e) => void handle(e.url));
    return () => sub.remove();
  }, [accept]);

  const align = I18nManager.isRTL ? "right" : "left";

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <Text style={s.brand}>flaminGO</Text>
          <Text style={[s.tagline, { textAlign: align }]}>
            {tr(msg, "auth.tagline")}
          </Text>
        </View>

        <View style={s.hero}>
          <View style={s.heroGlow} />
          {assetsReady ? <BrandModel /> : <ActivityIndicator color="#111" />}
        </View>

        <Animated.View layout={LinearTransition.springify().damping(18)} style={s.sheet}>
          {error ? (
            <Animated.Text entering={FadeIn} style={s.error}>
              {error}
            </Animated.Text>
          ) : null}

          {mode === "entry" ? (
            <Animated.View entering={FadeInDown.duration(260)} style={s.gap}>
              <PrimaryButton
                label={tr(msg, "auth.continuePhone")}
                disabled={!!busy}
                onPress={() => {
                  setError(null);
                  setMode("phone");
                }}
              />
              <GoogleButton
                label={tr(msg, "auth.continueGoogle")}
                loading={busy === "google"}
                disabled={!!busy}
                onPress={guard("google", async () => {
                  await accept(await signInWithGoogle());
                })}
              />
              <Text style={s.legal}>{tr(msg, "auth.legalHint")}</Text>
            </Animated.View>
          ) : mode === "phone" ? (
            <Animated.View entering={FadeInDown.duration(260)} style={s.gap}>
              <PhoneField
                value={phone}
                onChangeText={setPhone}
                placeholder={tr(msg, "auth.phone")}
              />
              <PrimaryButton
                label={tr(msg, "common.continue")}
                loading={busy === "phone"}
                disabled={!!busy}
                onPress={guard("phone", async () => {
                  setConfirmation(await requestPhone(phone));
                  setCode("");
                  setMode("otp");
                })}
              />
              <GhostButton
                label={tr(msg, "common.back")}
                onPress={() => setMode("entry")}
              />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(260)} style={s.gap}>
              <Text style={[s.otpHint, { textAlign: align }]}>
                {`${tr(msg, "auth.otpSentTo")} ${phone}`}
              </Text>
              <OtpField
                value={code}
                onChangeText={setCode}
                placeholder={tr(msg, "auth.otp")}
              />
              <PrimaryButton
                label={tr(msg, "auth.verifyOtp")}
                loading={busy === "otp"}
                disabled={!!busy || !confirmation}
                onPress={guard("otp", async () => {
                  if (!confirmation) throw Error("NO_CONFIRMATION");
                  await accept(await confirmPhone(confirmation, code));
                })}
              />
              <GhostButton
                label={tr(msg, "common.back")}
                onPress={() => setMode("phone")}
              />
            </Animated.View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.primary,
        (disabled || loading) && s.dim,
        pressed && s.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={s.primaryText}>{label}</Text>
      )}
    </Pressable>
  );
}

function GoogleButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.google,
        (disabled || loading) && s.dim,
        pressed && s.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#111" />
      ) : (
        <>
          <View style={s.gBadge}>
            <Text style={s.gG}>G</Text>
          </View>
          <Text style={s.googleText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.ghost, pressed && s.pressed]}
    >
      <Text style={s.ghostText}>{label}</Text>
    </Pressable>
  );
}

function PhoneField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={s.phoneRow}>
      <View style={s.prefix}>
        <Text style={s.prefixText}>+213</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA0A9"
        keyboardType="phone-pad"
        maxLength={15}
        style={s.phoneInput}
      />
    </View>
  );
}

function OtpField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#C2C6CD"
      keyboardType="number-pad"
      maxLength={6}
      style={s.otpInput}
    />
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { paddingHorizontal: 28, paddingTop: 12 },
  brand: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    color: "#0E0E10",
  },
  tagline: { marginTop: 6, fontSize: 15, color: "#6B7280", fontWeight: "600" },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  heroGlow: {
    position: "absolute",
    width: 264,
    height: 264,
    borderRadius: 132,
    backgroundColor: "#F3F4F6",
  },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 10,
    gap: 14,
  },
  gap: { gap: 12 },
  error: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  primary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#0E0E10",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  google: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E3E8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleText: { color: "#111111", fontSize: 16, fontWeight: "700" },
  gBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E3E8",
    alignItems: "center",
    justifyContent: "center",
  },
  gG: { color: "#4285F4", fontSize: 17, fontWeight: "900" },
  ghost: { height: 48, alignItems: "center", justifyContent: "center" },
  ghostText: { color: "#6B7280", fontSize: 15, fontWeight: "700" },
  dim: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  legal: {
    color: "#9AA0A9",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 4,
  },
  otpHint: { color: "#4B5563", fontSize: 14, fontWeight: "600" },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prefix: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E1E3E8",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  prefixText: { fontSize: 16, fontWeight: "800", color: "#111111" },
  phoneInput: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E1E3E8",
    paddingHorizontal: 16,
    fontSize: 18,
    color: "#111111",
    textAlign: "left",
  },
  otpInput: {
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E1E3E8",
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 8,
    color: "#111111",
    textAlign: "center",
  },
});
