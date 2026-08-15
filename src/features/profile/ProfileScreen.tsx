/**
 * إكمال الملف الشخصي — the one screen a new passenger sees after Firebase
 * has proven the phone number.
 *
 * Four things are collected here, and all four leave in a single save:
 *   • name      -> PATCH /passenger/me { name }
 *   • photo     -> POST /passenger/me/upload-url, PUT to R2, then { avatarUrl }
 *   • gender    -> PATCH /passenger/me { gender }
 *   • password  -> PATCH /passenger/me { password }, hashed server-side with the
 *                  project's existing bcryptjs setup
 *
 * The password is what turns the daily sign-in into phone + password
 * (POST /auth/login), leaving Firebase SMS for first registration and account
 * recovery only.
 */
import React, { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Camera, Eye, EyeOff, Lock } from "lucide-react-native"
import { uploadAvatar } from "../../core/avatar-upload"
import { passengerServicesApi } from "../../core/passenger-api"
import type { Gender } from "../../core/contracts"
import { tr } from "../../core/i18n"
import { useMessages } from "../../core/use-messages"
import { useSession } from "../../core/session-store"
import { useTheme } from "../../core/theme-store"
import type { Palette } from "../../core/theme"
import { pickImageFromLibrary } from "../menu/media"

// صورتا اختيار الجنس المرفقتان داخل التطبيق.
const MALE_ICON = require("../../../assets/gender-male.webp") as number
const FEMALE_ICON = require("../../../assets/gender-female.webp") as number

const GENDER_OPTIONS: { value: Gender; icon: number }[] = [
  { value: "MALE", icon: MALE_ICON },
  { value: "FEMALE", icon: FEMALE_ICON },
]

// نفس الحد الأدنى المعتمد في الخادم (RegisterDto و UpdatePassengerProfileDto).
const MIN_PASSWORD = 6

export function ProfileScreen() {
  const restore = useSession((state) => state.restore)
  const { palette } = useTheme()
  const styles = useMemo(() => makeStyles(palette), [palette])
  // نمط الترجمة الموحّد في التطبيق: مخزن اللغة المشترك، لا تحميل يدوي لكل شاشة.
  const { messages } = useMessages()
  const [name, setName] = useState("")
  const [gender, setGender] = useState<Gender | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  async function choosePhoto() {
    if (saving) return
    const uri = await pickImageFromLibrary(messages)
    if (uri) setPhoto(uri)
  }

  async function save() {
    if (!name.trim() || !gender || password.length < MIN_PASSWORD || saving) return
    setSaving(true)
    try {
      // الصورة تُرفع أولاً إلى R2 عبر نظام الخادم الموجود، ثم يُحفظ رابطها
      // مع بقية البيانات في طلب واحد — دون نظام رفع جديد.
      let avatarUrl: string | undefined
      if (photo) {
        try {
          avatarUrl = (await uploadAvatar(photo)).key
        } catch {
          Alert.alert(
            tr(messages, "profile.completeTitle"),
            tr(messages, "profile.photoUploadFailed"),
          )
          return
        }
      }

      await passengerServicesApi.updateProfile({
        name: name.trim(),
        gender,
        password,
        ...(avatarUrl ? { avatarUrl } : {}),
      })
      await restore()
    } catch {
      Alert.alert(
        tr(messages, "profile.completeTitle"),
        tr(messages, "profile.saveFailed"),
      )
    } finally {
      setSaving(false)
    }
  }

  const canContinue =
    !!name.trim() && !!gender && password.length >= MIN_PASSWORD && !saving

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{tr(messages, "profile.completeTitle")}</Text>

      {/* الصورة الشخصية */}
      <Pressable
        onPress={choosePhoto}
        accessibilityRole="button"
        accessibilityLabel={tr(messages, "profile.choosePhoto")}
        style={styles.avatarBlock}
      >
        <View style={styles.avatar}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatarImage} />
          ) : (
            <Camera size={28} color={palette.textMuted} strokeWidth={2} />
          )}
        </View>
        <Text style={styles.avatarHint}>
          {tr(messages, photo ? "profile.photoSelected" : "profile.choosePhoto")}
        </Text>
      </Pressable>

      {/* الاسم */}
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={tr(messages, "profile.name")}
        placeholderTextColor={palette.textMuted}
        style={styles.input}
      />

      {/* كلمة المرور — بنفس شكل حقل الاسم، مع قفل وزر إظهار/إخفاء */}
      <View style={styles.passwordRow}>
        <Lock size={20} color={palette.textMuted} strokeWidth={2} />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={tr(messages, "profile.password")}
          placeholderTextColor={palette.textMuted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          style={styles.passwordInput}
        />
        <Pressable
          onPress={() => setShowPassword((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={tr(messages, "password.toggle")}
          hitSlop={12}
        >
          {showPassword ? (
            <EyeOff size={20} color={palette.textMuted} strokeWidth={2} />
          ) : (
            <Eye size={20} color={palette.textMuted} strokeWidth={2} />
          )}
        </Pressable>
      </View>
      <Text style={styles.passwordHint}>{tr(messages, "profile.passwordHint")}</Text>

      {/* اختيار الجنس */}
      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((option) => {
          const active = gender === option.value
          return (
            <Pressable
              key={option.value}
              onPress={() => setGender(option.value)}
              style={[styles.genderCard, active && styles.genderCardActive]}
            >
              <Image
                source={option.icon}
                style={styles.genderImage}
                resizeMode="contain"
              />
              <Text style={[styles.genderLabel, active && styles.genderLabelActive]}>
                {tr(messages, `gender.${option.value}`)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* إكمال التسجيل */}
      <Pressable
        onPress={save}
        disabled={!canContinue}
        style={[styles.button, !canContinue && styles.disabled]}
      >
        {saving ? (
          <ActivityIndicator color={palette.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>{tr(messages, "common.continue")}</Text>
        )}
      </Pressable>
    </View>
  )
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "center",
      gap: 20,
      padding: 24,
      backgroundColor: palette.bg,
    },
    title: {
      fontSize: 28,
      fontWeight: "900",
      color: palette.text,
      textAlign: "center",
    },
    avatarBlock: { alignItems: "center", gap: 8 },
    avatar: {
      width: 104,
      height: 104,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
    },
    avatarImage: { width: "100%", height: "100%" },
    avatarHint: { color: palette.textMuted, fontWeight: "600" },
    input: {
      height: 56,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      color: palette.text,
      borderRadius: 12,
      padding: 16,
    },
    passwordRow: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      borderRadius: 12,
    },
    passwordInput: { flex: 1, color: palette.text, padding: 0 },
    passwordHint: { marginTop: -12, color: palette.textMuted, fontSize: 12 },
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
  })
}
