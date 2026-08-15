import React, { useEffect, useMemo, useState } from "react";
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
import { useTheme } from "../../core/theme-store";
import type { Palette } from "../../core/theme";
import {
  completeEmailLink,
  confirmPhone,
  requestPhone,
} from "./firebase";
import { Eye, EyeOff } from "lucide-react-native";
import { loginWithPassword } from "./password-login";
import { authErrorKey } from "./auth-errors";
import { useSession } from "../../core/session-store";

// App logo (replaces the removed 3D model). Shown centered on the launch screen.
const APP_LOGO = require("../../../assets/app-logo.webp") as number;

// Flag icons for the language switcher (icons only, no labels).
const FLAGS: Record<Locale, number> = {
  ar: require("../../../assets/flag-ar.webp") as number,
  fr: require("../../../assets/flag-fr.webp") as number,
  en: require("../../../assets/flag-en.webp") as number,
};

// "password" is the daily sign-in (POST /auth/login). "phone"/"otp" stay the
// Firebase route: first registration, recovery and security checks.
type Mode = "entry" | "password" | "phone" | "otp";
type Busy = null | "password" | "phone" | "otp";

// Mirrors the server minimum (RegisterDto / UpdatePassengerProfileDto).
const MIN_PASSWORD = 6;
type Styles = ReturnType<typeof makeStyles>;

export function AuthScreen() {
  const messages = useLocaleStore((state) => state.messages);
  const locale = useLocaleStore((state) => state.locale);
  const hydrate = useLocaleStore((state) => state.hydrate);
  const { palette } = useTheme();
  const s = useMemo(() => makeStyles(palette), [palette]);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>("entry");
  const [confirmation, setConfirmation] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const accept = useSession((state) => state.accept);
  const expired = useSession((state) => state.expired);

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
          // The server tells us exactly what went wrong (INVALID_CREDENTIALS,
          // ACCOUNT_INACTIVE, RATE_LIMITED…) and so does Firebase; show that
          // instead of one anonymous "something went wrong".
          setError(tr(messages, authErrorKey(e)));
        })
        .finally(() => setBusy(null));
    };

  useEffect(() => {
    void hydrate();
  }, [locale, hydrate]);

  // Being bounced to the login screen by an expired refresh token used to be
  // completely silent. Reuse the existing error slot to say what happened.
  useEffect(() => {
    if (expired) setError(tr(messages, "session.expired.body"));
  }, [expired, messages]);

  useEffect(() => {
    void syncManagedAssets().catch(() => undefined);
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
          <LanguagePicker styles={s} />
        </View>

        <View style={s.hero}>
          <Image source={APP_LOGO} style={s.logo} resizeMode="contain" />
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
                styles={s}
                palette={palette}
                label={tr(messages, "auth.signIn")}
                disabled={!!busy}
                onPress={() => {
                  setError(null);
                  setPassword("");
                  setMode("password");
                }}
              />
              <GhostButton
                styles={s}
                label={tr(messages, "auth.continuePhone")}
                onPress={() => {
                  setError(null);
                  setMode("phone");
                }}
              />
              <Text style={s.legal}>{tr(messages, "auth.legalHint")}</Text>
            </Animated.View>
          ) : mode === "password" ? (
            <Animated.View entering={FadeInDown.duration(260)} style={s.gap}>
              <PhoneField
                styles={s}
                palette={palette}
                value={phone}
                onChangeText={setPhone}
                placeholder={tr(messages, "auth.phone")}
              />
              <PasswordField
                styles={s}
                palette={palette}
                value={password}
                onChangeText={setPassword}
                placeholder={tr(messages, "auth.password")}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                toggleLabel={tr(messages, "password.toggle")}
              />
              <PrimaryButton
                styles={s}
                palette={palette}
                label={tr(messages, "auth.signIn")}
                loading={busy === "password"}
                disabled={!!busy || password.length < MIN_PASSWORD}
                onPress={guard("password", async () => {
                  await accept(await loginWithPassword(phone, password));
                })}
              />
              {/* No password yet, or forgotten: the SMS route still works. */}
              <GhostButton
                styles={s}
                label={tr(messages, "auth.useSms")}
                onPress={() => {
                  setError(null);
                  setPassword("");
                  setMode("phone");
                }}
              />
            </Animated.View>
          ) : mode === "phone" ? (
            <Animated.View entering={FadeInDown.duration(260)} style={s.gap}>
              <PhoneField
                styles={s}
                palette={palette}
                value={phone}
                onChangeText={setPhone}
                placeholder={tr(messages, "auth.phone")}
              />
              <PrimaryButton
                styles={s}
                palette={palette}
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
                styles={s}
                label={tr(messages, "common.back")}
                onPress={() => setMode("entry")}
              />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(260)} style={s.gap}>
              {/* Heetch-style OTP identity: huge uppercase heavy title, minimal
                  dash-shaped code field, muted secondary text. */}
              <Text style={s.otpTitle}>
                {tr(messages, "auth.verifyOtp").toUpperCase()}
              </Text>
              <Text style={[s.otpHint, { textAlign: align }]}>
                {`${tr(messages, "auth.otpSentTo")} ${phone}`}
              </Text>
              <OtpField
                styles={s}
                palette={palette}
                value={code}
                onChangeText={setCode}
                placeholder={tr(messages, "auth.otp")}
              />
              <PrimaryButton
                styles={s}
                palette={palette}
                label={tr(messages, "auth.verifyOtp")}
                loading={busy === "otp"}
                disabled={!!busy || !confirmation}
                onPress={guard("otp", async () => {
                  if (!confirmation) throw Error("NO_CONFIRMATION");
                  await accept(await confirmPhone(confirmation, code));
                })}
              />
              <GhostButton
                styles={s}
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
function LanguagePicker({ styles }: { styles: Styles }) {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const [open, setOpen] = useState(false);
  const others = SUPPORTED_LOCALES.filter((l) => l !== locale);

  return (
    <View style={styles.langWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`language: ${locale}`}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.flagBtn, pressed && styles.pressed]}
      >
        <Image source={FLAGS[locale]} style={styles.flag} />
      </Pressable>
      {open ? (
        <View style={styles.langMenu}>
          {others.map((l) => (
            <Pressable
              key={l}
              accessibilityRole="button"
              accessibilityLabel={`switch language to ${l}`}
              onPress={() => {
                setOpen(false);
                void setLocale(l);
              }}
              style={({ pressed }) => [styles.flagBtn, pressed && styles.pressed]}
            >
              <Image source={FLAGS[l]} style={styles.flag} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// Password entry: same hairline look as the phone field, plus an eye toggle.
function PasswordField({
  styles,
  palette,
  value,
  onChangeText,
  placeholder,
  visible,
  onToggle,
  toggleLabel,
}: {
  styles: Styles;
  palette: Palette;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
  toggleLabel: string;
}) {
  return (
    <View style={styles.passwordRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        style={styles.passwordInput}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={toggleLabel}
        onPress={onToggle}
        hitSlop={12}
      >
        {visible ? (
          <EyeOff size={20} color={palette.textMuted} strokeWidth={2} />
        ) : (
          <Eye size={20} color={palette.textMuted} strokeWidth={2} />
        )}
      </Pressable>
    </View>
  );
}

function PrimaryButton({
  styles,
  palette,
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  styles: Styles;
  palette: Palette;
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
        styles.primary,
        (disabled || loading) && styles.dim,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.onPrimary} />
      ) : (
        <Text style={styles.primaryText}>{label}</Text>
      )}
    </Pressable>
  );
}

function GhostButton({
  styles,
  label,
  onPress,
}: {
  styles: Styles;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
    >
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

function PhoneField({
  styles,
  palette,
  value,
  onChangeText,
  placeholder,
}: {
  styles: Styles;
  palette: Palette;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.phoneRow}>
      <View style={styles.prefix}>
        <Text style={styles.prefixText}>+213</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        keyboardType="phone-pad"
        maxLength={15}
        style={styles.phoneInput}
      />
    </View>
  );
}

function OtpField({
  styles,
  palette,
  value,
  onChangeText,
  placeholder,
}: {
  styles: Styles;
  palette: Palette;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.textMuted}
      keyboardType="number-pad"
      maxLength={6}
      style={styles.otpInput}
    />
  );
}

// All colours come from the active palette (light / dark) — no literal hex.
function makeStyles(palette: Palette) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: palette.bg },
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
      color: palette.text,
    },
    brandGo: {
      color: palette.accent,
      fontSize: 34,
      fontWeight: "900",
      letterSpacing: -1,
    },
    tagline: {
      marginTop: 6,
      fontSize: 15,
      color: palette.textMuted,
      fontWeight: "600",
    },
    // Language switcher
    langWrap: { position: "relative", marginLeft: 12, zIndex: 30 },
    flagBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surfaceAlt,
    },
    flag: { width: 34, height: 34, borderRadius: 17 },
    langMenu: {
      position: "absolute",
      top: 50,
      right: 0,
      padding: 6,
      gap: 8,
      borderRadius: 26,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: "center",
    },
    hero: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 8,
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
      color: palette.danger,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
    },
    primary: {
      height: 56,
      borderRadius: 16,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: { color: palette.onPrimary, fontSize: 16, fontWeight: "800" },
    ghost: { height: 48, alignItems: "center", justifyContent: "center" },
    ghostText: { color: palette.textMuted, fontSize: 15, fontWeight: "700" },
    dim: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
    legal: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 4,
    },
    otpTitle: {
      color: palette.text,
      fontSize: 32,
      fontWeight: "900",
      letterSpacing: -0.5,
    },
    otpHint: { color: palette.textMuted, fontSize: 14, fontWeight: "600" },
    phoneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    passwordRow: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
    },
    passwordInput: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: palette.text,
      padding: 0,
    },
    prefix: {
      height: 56,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    prefixText: { fontSize: 16, fontWeight: "800", color: palette.text },
    phoneInput: {
      flex: 1,
      height: 56,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      paddingHorizontal: 16,
      fontSize: 18,
      color: palette.text,
      textAlign: "left",
    },
    // Minimal "dashes" code field: no box, just an underline per the Heetch
    // reference, with wide letter spacing so digits read as separate dashes.
    otpInput: {
      height: 60,
      borderBottomWidth: 2,
      borderBottomColor: palette.border,
      paddingHorizontal: 4,
      fontSize: 28,
      fontWeight: "900",
      letterSpacing: 14,
      color: palette.text,
      textAlign: "center",
    },
  });
}
