import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../core/api";
import type { Gender } from "../../core/contracts";
import { loadTranslations, tr } from "../../core/i18n";
import { useSession } from "../../core/session-store";

// صورتا اختيار الجنس (ذكر/أنثى) المرفقتان — مجمّعتان داخل التطبيق.
const MALE_ICON = require("../../../assets/gender-male.png") as number;
const FEMALE_ICON = require("../../../assets/gender-female.png") as number;

// في صفحة إكمال الملف الشخصي نكتفي بـ ذكر/أنثى عبر الصورتين.
const GENDER_OPTIONS: { value: Gender; icon: number }[] = [
  { value: "MALE", icon: MALE_ICON },
  { value: "FEMALE", icon: FEMALE_ICON },
];

export function ProfileScreen() {
  const restore = useSession((state) => state.restore);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // اللغة ثابتة (العربية) في هذه الصفحة — لم نعد نعرض اختيار اللغات هنا.
  useEffect(() => {
    loadTranslations("ar")
      .then(setMessages)
      .catch(() => undefined);
  }, []);

  // يرفع الصورة المختارة إلى التخزين ويحفظ رابط العرض.
  async function uploadAsset(asset: ImagePicker.ImagePickerAsset) {
    setUploading(true);
    try {
      const contentType = asset.mimeType ?? "image/jpeg";
      const { data } = await api.post<{ uploadUrl: string; readUrl: string }>(
        "/passenger/me/upload-url",
        { contentType },
      );
      const body = await fetch(asset.uri).then((response) => response.blob());
      await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body,
      });
      setAvatarUrl(data.readUrl);
    } catch (error) {
      Alert.alert(
        tr(messages, "profile.choosePhoto"),
        tr(messages, "profile.photoUploadFailed"),
      );
    } finally {
      setUploading(false);
    }
  }

  // يلتقط سيلفي من الكاميرا.
  async function takeSelfie() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        tr(messages, "profile.takeSelfie"),
        tr(messages, "profile.cameraDenied"),
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadAsset(result.assets[0]);
  }

  // يختار صورة من معرض الهاتف.
  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadAsset(result.assets[0]);
  }

  // عند الضغط على الدائرة: اختيار من الهاتف أو التقاط سيلفي.
  function onAvatarPress() {
    if (uploading) return;
    Alert.alert(
      tr(messages, "profile.photoSourceTitle"),
      undefined,
      [
        { text: tr(messages, "profile.fromLibrary"), onPress: pickFromLibrary },
        { text: tr(messages, "profile.takeSelfie"), onPress: takeSelfie },
        { text: tr(messages, "common.cancel"), style: "cancel" },
      ],
      { cancelable: true },
    );
  }

  async function save() {
    if (!name.trim() || !gender || saving) return;
    setSaving(true);
    try {
      await api.patch("/passenger/me", {
        name: name.trim(),
        locale: "ar",
        gender,
        ...(avatarUrl ? { avatarUrl } : {}),
      });
      await restore();
    } catch (error) {
      Alert.alert(
        tr(messages, "profile.completeTitle"),
        tr(messages, "profile.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  const canContinue = !!name.trim() && !!gender && !uploading && !saving;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        gap: 24,
        padding: 24,
        backgroundColor: "#fff",
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: "#111",
          textAlign: "center",
        }}
      >
        {tr(messages, "profile.completeTitle")}
      </Text>

      {/* دائرة صورة الملف الشخصي */}
      <View style={{ alignItems: "center" }}>
        <Pressable onPress={onAvatarPress} style={avatarCircle}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={avatarImage} />
          ) : uploading ? (
            <ActivityIndicator color="#111" />
          ) : (
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 34 }}>📷</Text>
              <Text style={{ color: "#666", fontSize: 13 }}>
                {tr(messages, "profile.choosePhoto")}
              </Text>
            </View>
          )}
          {uploading && avatarUrl ? (
            <View style={avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* الاسم */}
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={tr(messages, "profile.name")}
        style={input}
      />

      {/* اختيار الجنس عبر الصورتين */}
      <View style={{ flexDirection: "row", gap: 16, justifyContent: "center" }}>
        {GENDER_OPTIONS.map((option) => {
          const active = gender === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setGender(option.value)}
              style={[genderCard, active && genderCardActive]}
            >
              <Image source={option.icon} style={genderImage} resizeMode="contain" />
              <Text
                style={{
                  fontWeight: active ? "700" : "500",
                  color: active ? "#111" : "#666",
                }}
              >
                {tr(messages, `gender.${option.value}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* متابعة */}
      <Pressable
        onPress={save}
        disabled={!canContinue}
        style={[button, !canContinue && { opacity: 0.35 }]}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            {tr(messages, "common.continue")}
          </Text>
        )}
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
  textAlign: "right",
} as const;
const avatarCircle = {
  width: 140,
  height: 140,
  borderRadius: 70,
  borderWidth: 2,
  borderColor: "#ddd",
  borderStyle: "dashed",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fafafa",
  overflow: "hidden",
} as const;
const avatarImage = {
  width: "100%",
  height: "100%",
} as const;
const avatarOverlay = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0,0,0,0.35)",
} as const;
const genderCard = {
  flex: 1,
  maxWidth: 160,
  alignItems: "center",
  gap: 8,
  paddingVertical: 16,
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 16,
  backgroundColor: "#fff",
} as const;
const genderCardActive = {
  borderColor: "#111",
  borderWidth: 2,
  backgroundColor: "#f4f4f4",
} as const;
const genderImage = {
  width: 88,
  height: 88,
} as const;
const button = {
  height: 56,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#111",
  borderRadius: 12,
} as const;
