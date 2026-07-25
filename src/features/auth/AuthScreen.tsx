import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { syncManagedAssets } from "../../core/assets";
import { tr } from "../../core/i18n";
import { useLocaleStore, SUPPORTED_LOCALES } from "../../core/locale-store";
import type { Locale } from "../../core/contracts";
import { reportError } from "../../core/observability";
import {
  completeEmailLink,
  confirmPhone,
  requestPhone,
} from "./firebase";
import { useSession } from "../../core/session-store";

// App logo (replaces the removed 3D model). Shown centered on the launch screen.
const APP_LOGO = require("../../../assets/app-logo.png") as number;

// Flag icons for the language switcher (icons only, no labels).
const FLAGS: Record<Locale, number> = {
  ar: require("../../../assets/flag-ar.png") as number,
  fr: require("../../../assets/flag-fr.png") as number,
  en: require("../../../assets/flag-en.png") as number,
};

type Mode = "entry" | "phone" | "otp";
type Busy = null | "phone" | "otp";

export function AuthScreen() {
  const messages = useLocaleStore((state) => state.messages);
  const locale = useLocaleStore((state) => state.locale);
  const hydrate = useLocaleStore((state) => state.hydrate);
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
  // silent no-op.
  const guard =
    (kind: Exclude<Busy, null>, fn: () => Promise<void>) => () => {
      if (busy) return;
      setError(null);
      setBusy(kind);
      void fn()
        .catch((e: unknown) => {
          reportError(e, `auth.${kind}`);
          setError(tr(messages, "common.error"));
        })
        .finally(() => setBusy(null));
    };

  useEffect(() => {
    void hydrate();
  }, [locale, hydrate]);

  useEffect(() => {
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

  const align = locale === "ar" ? "right" : "left";

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={s.brand}>
              flamin<Text style={s.brandGo}>GO</Text>
            </Text>
            <Text style={[s.tagline, { textAlign: align }]}>
              {tr(messages, "auth.tagline")}
            </Text>
          </View>
          <LanguagePicker />
        </View>

        <View style={s.hero}>
          <View style={s.heroGlow} />
          {assetsReady ? (
            <Image source={APP_LOGO} style={s.logo} resizeMode="contain" />
          ) : (
            <ActivityIndicator color="#111" />
          )}
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
                label={tr(messages, "auth.continuePhone")}
                disabled={!!busy}
                onPress={() => {
                  setError(null);
                  setMode("phone");
                }}
              />
              <Text style={s.legal}>{tr(messages, "auth.legalHint")}</Text>
            </Animated.View>
          ) : mode === "phone" ? (
            <Animated.View entering={FadeInDown.duration(260)} style={s.gap}>
              <PhoneField
                value={phone}
                onChangeText={setPhone}
                placeholder={tr(messages, "auth.phone")}
              />
              <PrimaryButton
                label={tr(messages, "common.continue")}
                loading={busy === "phone"}
                disabled={!!busy}
                onPress={guard("phone", async () => {
                  setConfirmation(await requestPhone(phone));
                  setCode("");
                  setMode("otp");
                })}
              />
              <GhostButton
                label={tr(messages, "common.back")}
                onPress={() => setMode("entry")}
              />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(260)} style={s.gap}>
              <Text style={[s.otpHint, { textAlign: align }]}>
                {`${tr(messages, "auth.otpSentTo")} ${phone}`}
              </Text>
              <OtpField
                value={code}
                onChangeText={setCode}
                placeholder={tr(messages, "auth.otp")}
              />
              <PrimaryButton
                label={tr(messages, "auth.verifyOtp")}
                loading={busy === "otp"}
                disabled={!!busy || !confirmation}
                onPress={guard("otp", async () => {
                  if (!confirmation) throw Error("NO_CONFIRMATION");
                  await accept(await confirmPhone(confirmation, code));
                })}
              />
              <GhostButton
                label={tr(messages, "common.back")}
                onPress={() => setMode("phone")}
              />
            </Animated.View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Language switcher: shows ONLY the current language's flag. Tapping it reveals
// the other flags; picking one switches the whole app's language instantly.
function LanguagePicker() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const [open, setOpen] = useState(false);
  const others = SUPPORTED_LOCALES.filter((l) => l !== locale);

  return (
    <View style={s.langWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`language: ${locale}`}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [s.flagBtn, pressed && s.pressed]}
      >
        <Image source={FLAGS[locale]} style={s.flag} />
      </Pressable>
      {open ? (
        <View style={s.langMenu}>
          {others.map((l) => (
            <Pressable
              key={l}
              accessibilityRole="button"
              accessibilityLabel={`switch language to ${l}`}
              onPress={() => {
                setOpen(false);
                void setLocale(l);
              }}
              style={({ pressed }) => [s.flagBtn, pressed && s.pressed]}
            >
              <Image source={FLAGS[l]} style={s.flag} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 12,
    zIndex: 20,
  },
  headerText: { flex: 1 },
  brand: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    color: "#1B1B1F",
  },
  brandGo: {
    color: "#D9A520",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
  },
  tagline: { marginTop: 6, fontSize: 15, color: "#6B7280", fontWeight: "600" },
  // Language switcher
  langWrap: { position: "relative", marginLeft: 12, zIndex: 30 },
  flagBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  flag: { width: 34, height: 34, borderRadius: 17 },
  langMenu: {
    position: "absolute",
    top: 50,
    right: 0,
    padding: 6,
    gap: 8,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECECEC",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
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
  logo: {
    width: 240,
    height: 240,
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
