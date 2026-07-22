import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Pressable, Text, TextInput, View } from "react-native";
import { api } from "../../core/api";
import type { Gender, Locale } from "../../core/contracts";
import { loadTranslations, tr } from "../../core/i18n";
import { useSession } from "../../core/session-store";

const GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];
const LOCALES: Locale[] = ["ar", "fr", "en"];

export function ProfileScreen() {
  const restore = useSession((state) => state.restore);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [locale, setLocale] = useState<Locale>("ar");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    loadTranslations(locale)
      .then(setMessages)
      .catch(() => undefined);
  }, [locale]);

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const contentType = asset.mimeType ?? "image/jpeg";
    const { data } = await api.post<{
      uploadUrl: string;
      readUrl: string;
    }>("/passenger/me/upload-url", { contentType });
    const body = await fetch(asset.uri).then((response) => response.blob());
    await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });
    setAvatarUrl(data.readUrl);
  }

  async function save() {
    if (!gender || !avatarUrl) return;
    await api.patch("/passenger/me", { name, locale, gender, avatarUrl });
    await restore();
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        gap: 16,
        padding: 24,
        backgroundColor: "#fff",
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "700", color: "#111" }}>
        {tr(messages, "profile.completeTitle")}
      </Text>
      <Pressable onPress={choosePhoto} style={choice}>
        <Text>
          {avatarUrl
            ? tr(messages, "profile.photoSelected")
            : tr(messages, "profile.choosePhoto")}
        </Text>
      </Pressable>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={tr(messages, "profile.name")}
        style={input}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {GENDERS.map((value) => (
          <Pressable
            key={value}
            onPress={() => setGender(value)}
            style={[choice, gender === value && selected]}
          >
            <Text>{tr(messages, `gender.${value}`)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {LOCALES.map((value) => (
          <Pressable
            key={value}
            onPress={() => setLocale(value)}
            style={[choice, locale === value && selected]}
          >
            <Text>{tr(messages, `locale.${value}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={save}
        disabled={!name.trim() || !gender || !avatarUrl}
        style={[
          button,
          (!name.trim() || !gender || !avatarUrl) && { opacity: 0.35 },
        ]}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>
          {tr(messages, "common.continue")}
        </Text>
      </Pressable>
    </View>
  );
}

const input = {
  height: 56,
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 12,
  padding: 16,
} as const;
const choice = {
  minHeight: 48,
  justifyContent: "center",
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 12,
  paddingHorizontal: 14,
} as const;
const selected = { borderColor: "#111", backgroundColor: "#f4f4f4" } as const;
const button = {
  height: 56,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#111",
  borderRadius: 12,
} as const;
