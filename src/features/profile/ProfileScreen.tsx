import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../core/api";
import type { Gender } from "../../core/contracts";
import { loadTranslations, tr } from "../../core/i18n";
import { useSession } from "../../core/session-store";
import { useTheme } from "../../core/theme-store";
import type { Palette } from "../../core/theme";

// صورتا اختيار الجنس (ذكر/أنثى) المرفقتان — مجمّعتان داخل التطبيق.
const MALE_ICON = require("../../../assets/gender-male.webp") as number;
const FEMALE_ICON = require("../../../assets/gender-female.webp") as number;

// في صفحة إكمال الملف الشخصي نكتفي بـ ذكر/أنثى عبر الصورتين.
const GENDER_OPTIONS: { value: Gender; icon: number }[] = [
  { value: "MALE", icon: MALE_ICON },
  { value: "FEMALE", icon: FEMALE_ICON },
];

// ملاحظة: أُزيلت الصورة الشخصية بالكامل من تطبيق الراكب (ستُعتمد لاحقاً في
// تطبيق السائق فقط). هذه الصفحة تكتفي بالاسم والجنس.
export function ProfileScreen() {
  const restore = useSession((state) => state.restore);
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTranslations()
      .then(setMessages)
      .catch(() => undefined);
  }, []);

  async function save() {
    if (!name.trim() || !gender || saving) return;
    setSaving(true);
    try {
      await api.patch("/passenger/me", {
        name: name.trim(),
        gender,
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

  const canContinue = !!name.trim() && !!gender && !saving;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>
        {tr(messages, "profile.completeTitle")}
      </Text>

      {/* الاسم */}
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={tr(messages, "profile.name")}
        placeholderTextColor={palette.textMuted}
        style={styles.input}
      />

      {/* اختيار الجنس عبر الصورتين */}
      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((option) => {
          const active = gender === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setGender(option.value)}
              style={[styles.genderCard, active && styles.genderCardActive]}
            >
              <Image source={option.icon} style={styles.genderImage} resizeMode="contain" />
              <Text style={[styles.genderLabel, active && styles.genderLabelActive]}>
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
        style={[styles.button, !canContinue && styles.disabled]}
      >
        {saving ? (
          <ActivityIndicator color={palette.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>
            {tr(messages, "common.continue")}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "center",
      gap: 24,
      padding: 24,
      backgroundColor: palette.bg,
    },
    title: {
      fontSize: 28,
      fontWeight: "900",
      color: palette.text,
      textAlign: "center",
    },
    input: {
      height: 56,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      color: palette.text,
      borderRadius: 12,
      padding: 16,
    },
    genderRow: { flexDirection: "row", gap: 16, justifyContent: "center" },
    genderCard: {
      flex: 1,
      maxWidth: 160,
      alignItems: "center",
      gap: 8,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 16,
      backgroundColor: palette.surface,
    },
    genderCardActive: {
      borderColor: palette.primary,
      borderWidth: 2,
      backgroundColor: palette.surfaceAlt,
    },
    genderImage: { width: 88, height: 88 },
    genderLabel: { fontWeight: "500", color: palette.textMuted },
    genderLabelActive: { fontWeight: "800", color: palette.text },
    button: {
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
      borderRadius: 12,
    },
    buttonText: { color: palette.onPrimary, fontWeight: "800", fontSize: 16 },
    disabled: { opacity: 0.35 },
  });
}
