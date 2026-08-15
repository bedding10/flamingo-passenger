/**
 * الحساب — passenger profile.
 *
 * Deliberately card-free: an avatar, two hairline rows (name, phone), one CTA,
 * then the two quiet links at the bottom. Password changing lives on its own
 * page now ("Password" route) so this screen holds ONE idea.
 *
 * Contracts are untouched: PATCH /passenger/me via `updateProfile`, and the
 * existing `useSession().logout()`.
 */
import React, { useMemo, useState } from "react"
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native"
import { useMutation } from "@tanstack/react-query"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { passengerServicesApi } from "../../core/passenger-api"
import { useSession } from "../../core/session-store"
import { tr } from "../../core/i18n"
import { useMessages } from "../../core/use-messages"
import { useTheme } from "../../core/theme-store"
import { reportError } from "../../core/observability"
import type { RootStackParamList } from "../../navigation/types"
import {
  LinkAction,
  MenuScaffold,
  PrimaryAction,
  StatusMessage,
  UnderlineField,
  UnderlineRow,
} from "../../components/menu/MenuScaffold"
import {
  CameraIcon,
  LockIcon,
  LogoutIcon,
  PersonIcon,
} from "../../components/icons/Icons"
import { colors, iconSize, radius, spacing, typography } from "../../design/theme"
import { pickImageFromLibrary } from "./media"
import { isLocalUri, uploadAvatar } from "../../core/avatar-upload"

type Props = NativeStackScreenProps<RootStackParamList, "Profile">

const AVATAR = 96
const FLAG = require("../../../assets/flag-ar.webp")
/** Algeria. The account phone is national, exactly as the backend stores it. */
const DIAL_CODE = "+213"

/** Splits "+213778…" / "0778…" into the national part shown after the code. */
function nationalPart(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith(DIAL_CODE)) return trimmed.slice(DIAL_CODE.length)
  if (trimmed.startsWith("00213")) return trimmed.slice(5)
  return trimmed
}

export function AccountScreen({ navigation }: Props) {
  const { messages } = useMessages()
  const { palette } = useTheme()
  const profile = useSession((state) => state.profile)
  const setProfile = useSession.setState
  const logout = useSession((state) => state.logout)

  const [name, setName] = useState(profile?.name ?? "")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile?.avatarUrl ?? null,
  )
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initial = useMemo(
    () => (name.trim().charAt(0) || "F").toUpperCase(),
    [name],
  )

  const dirty =
    name.trim().length > 1 &&
    (name.trim() !== (profile?.name ?? "") ||
      (avatarUrl ?? null) !== (profile?.avatarUrl ?? null))

  const save = useMutation({
    mutationFn: async () => {
      // A freshly picked image still lives on the device. Send it through the
      // server's existing flow (POST /passenger/me/upload-url -> R2) and store
      // the returned URL, never the local file:// path.
      const uploaded = isLocalUri(avatarUrl)
        ? (await uploadAvatar(avatarUrl as string)).key
        : avatarUrl
      return passengerServicesApi.updateProfile({
        name: name.trim(),
        avatarUrl: uploaded ?? undefined,
      })
    },
    onSuccess: (updated) => {
      setProfile({ profile: updated })
      setError(null)
      setSaved(true)
    },
    onError: () => {
      setSaved(false)
      setError(tr(messages, "account.saveError"))
    },
  })

  const changeAvatar = async () => {
    const uri = await pickImageFromLibrary(messages)
    if (!uri) return
    setAvatarUrl(uri)
    setSaved(false)
  }

  const confirmLogout = () => {
    Alert.alert(
      tr(messages, "account.logout"),
      tr(messages, "account.logoutConfirm"),
      [
        { text: tr(messages, "common.cancel"), style: "cancel" },
        {
          text: tr(messages, "account.logout"),
          style: "destructive",
          onPress: () => {
            void logout().catch((e) => reportError(e, "account.logout"))
          },
        },
      ],
    )
  }

  return (
    <MenuScaffold
      title={tr(messages, "account.title")}
      onBack={() => navigation.goBack()}
    >
      {/* Avatar, alone at the top. No card around it. */}
      <View style={styles.avatarBlock}>
        <Pressable
          onPress={changeAvatar}
          accessibilityRole="button"
          accessibilityLabel={tr(messages, "account.changePhoto")}
          style={({ pressed }) => [styles.avatarWrap, pressed && styles.dimmed]}
        >
          {/* Phase 11 - same avatar component everywhere; the frame comes
              from the server with the profile. */}
          <ProfileAvatar
            avatarUrl={avatarUrl}
            frameUrl={profile?.profileFrameUrl}
            size={96}
            fallback={initial}
            textColor={palette.accent}
          />
          <View style={[styles.badge, { borderColor: palette.bg }]}>
            <CameraIcon size={15} color={colors.black} />
          </View>
        </Pressable>
      </View>

      {/* Name: user icon + a single hairline. */}
      <UnderlineField
        leading={<PersonIcon size={iconSize.md} color={colors.gold} />}
        value={name}
        onChangeText={(text) => {
          setName(text)
          setSaved(false)
        }}
        placeholder={tr(messages, "account.namePlaceholder")}
        autoCapitalize="words"
        returnKeyType="done"
      />

      {/* Phone: flag, dial code, then the number. Read-only, hairline only. */}
      <UnderlineRow>
        <Image source={FLAG} style={styles.flag} resizeMode="cover" />
        <Text style={[styles.dial, { color: palette.textMuted }]}>
          {DIAL_CODE}
        </Text>
        <Text style={[styles.phone, { color: palette.text }]} numberOfLines={1}>
          {nationalPart(profile?.phone ?? "")}
        </Text>
      </UnderlineRow>

      {error ? <StatusMessage danger>{error}</StatusMessage> : null}
      {saved ? (
        <StatusMessage>{tr(messages, "account.saved")}</StatusMessage>
      ) : null}

      <PrimaryAction
        label={tr(messages, "account.save")}
        onPress={() => save.mutate()}
        disabled={!dirty}
        loading={save.isPending}
      />

      {/* Bottom of the page: password, then sign out. */}
      <View style={styles.footer}>
        <LinkAction
          label={tr(messages, "account.managePassword")}
          onPress={() => navigation.navigate("Password")}
          leading={<LockIcon size={iconSize.md} color={colors.gold} />}
        />
        <LinkAction
          label={tr(messages, "account.logout")}
          onPress={confirmLogout}
          color={colors.danger}
          leading={<LogoutIcon size={iconSize.md} color={colors.danger} />}
        />
      </View>
    </MenuScaffold>
  )
}

const styles = StyleSheet.create({
  dimmed: { opacity: 0.7 },
  avatarBlock: { alignItems: "center", marginBottom: spacing.xs },
  avatarWrap: { width: AVATAR, height: AVATAR },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  initial: {
    ...typography.display,
    fontSize: 40,
    color: colors.black,
  },
  badge: {
    position: "absolute",
    bottom: 0,
    insetInlineEnd: 0,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  flag: {
    width: 26,
    height: 18,
    borderRadius: radius.xs,
  },
  dial: {
    ...typography.subtitle,
    fontWeight: "700",
  },
  phone: {
    ...typography.subtitle,
    flex: 1,
    textAlign: "right",
    writingDirection: "ltr",
  },
  footer: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
})

export default AccountScreen
