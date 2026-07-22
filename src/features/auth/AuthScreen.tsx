import React, { useEffect, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { BrandModel } from "../../components/BrandModel";
import { syncManagedAssets } from "../../core/assets";
import { loadTranslations, tr } from "../../core/i18n";
import {
  completeEmailLink,
  confirmPhone,
  requestPhone,
  sendEmailLink,
} from "./firebase";
import { useSession } from "../../core/session-store";
type Mode = "entry" | "phone" | "otp" | "email" | "sent";
export function AuthScreen() {
  const [msg, setMsg] = useState<Record<string, string>>({}),
    [phone, setPhone] = useState(""),
    [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [mode, setMode] = useState<Mode>("entry"),
    [confirmation, setConfirmation] =
      useState<FirebaseAuthTypes.ConfirmationResult | null>(null),
    [assetsReady, setAssetsReady] = useState(false);
  const accept = useSession((s) => s.accept);
  useEffect(() => {
    loadTranslations("ar")
      .then(setMsg)
      .catch(() => {});
    syncManagedAssets()
      .then(() => setAssetsReady(true))
      .catch(() => setAssetsReady(true));
  }, []);
  useEffect(() => {
    const h = async (u: string | null) => {
      if (!u) return;
      const s = await completeEmailLink(u);
      if (s) await accept(s);
    };
    void Linking.getInitialURL().then(h);
    const x = Linking.addEventListener("url", (e) => void h(e.url));
    return () => x.remove();
  }, [accept]);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        paddingHorizontal: 24,
        paddingTop: 64,
        paddingBottom: 32,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "800",
          letterSpacing: -0.8,
          color: "#111",
        }}
      >
        flaminGO
      </Text>
      <View style={{ flex: 1, minHeight: 260, marginVertical: 16 }}>
        {assetsReady ? <BrandModel /> : null}
      </View>
      <View style={{ gap: 12 }}>
        {mode === "entry" ? (
          <>
            <Button
              title={tr(msg, "auth.continuePhone")}
              onPress={() => setMode("phone")}
            />
            <Button
              title={tr(msg, "auth.continueEmail")}
              inverse
              onPress={() => setMode("email")}
            />
          </>
        ) : mode === "phone" ? (
          <>
            <Field
              value={phone}
              onChangeText={setPhone}
              placeholder={tr(msg, "auth.phone")}
              keyboardType="phone-pad"
            />
            <Button
              title={tr(msg, "common.continue")}
              onPress={async () => {
                setConfirmation(await requestPhone(phone));
                setMode("otp");
              }}
            />
            <Back msg={msg} onPress={() => setMode("entry")} />
          </>
        ) : mode === "otp" && confirmation ? (
          <>
            <Field
              value={code}
              onChangeText={setCode}
              placeholder={tr(msg, "auth.otp")}
              keyboardType="number-pad"
            />
            <Button
              title={tr(msg, "auth.verifyOtp")}
              onPress={async () =>
                accept(await confirmPhone(confirmation, code))
              }
            />
            <Back msg={msg} onPress={() => setMode("phone")} />
          </>
        ) : mode === "email" ? (
          <>
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder={tr(msg, "auth.email")}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              title={tr(msg, "auth.sendEmailLink")}
              onPress={async () => {
                await sendEmailLink(email);
                setMode("sent");
              }}
            />
            <Back msg={msg} onPress={() => setMode("entry")} />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 15, lineHeight: 22, color: "#555" }}>
              {tr(msg, "auth.emailLinkSent")}
            </Text>
            <Button
              title={tr(msg, "auth.resendEmailLink")}
              inverse
              onPress={() => setMode("email")}
            />
          </>
        )}
      </View>
    </View>
  );
}
function Button({
  title,
  onPress,
  inverse = false,
}: {
  title: string;
  onPress: () => void;
  inverse?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 56,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: inverse ? "#fff" : "#111",
        borderWidth: 1,
        borderColor: "#111",
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: inverse ? "#111" : "#fff",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
function Back({
  msg,
  onPress,
}: {
  msg: Record<string, string>;
  onPress: () => void;
}) {
  return <Button title={tr(msg, "common.back")} inverse onPress={onPress} />;
}
function Field(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      style={{
        height: 56,
        borderWidth: 1,
        borderColor: "#dadada",
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 17,
        color: "#111",
      }}
    />
  );
}
