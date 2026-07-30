/**
 * Passenger account and security settings.
 * Profile mutations use PATCH /passenger/me; password changes use the
 * authenticated POST /auth/password/change contract.
 */
import React, { useCallback, useMemo, useState } from "react"
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native"
import { useMutation } from "@tanstack/react-query"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { passengerServicesApi } from "../../core/passenger-api"
import { useSession } from "../../core/session-store"
import type { RootStackParamList } from "../../navigation/types"
import {
	Card,
	LabeledInput,
	MenuScaffold,
	PrimaryAction,
	SectionLabel,
	StatusMessage,
} from "../../components/menu/MenuScaffold"
import { CameraIcon } from "../../components/icons/Icons"
import { colors, radius, spacing, typography } from "../../design/theme"
import { pickImageFromLibrary } from "./media"

type Props = NativeStackScreenProps<RootStackParamList, "Profile">

const AVATAR = 92
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/

export function AccountScreen({ navigation }: Props) {
	const profile = useSession((state) => state.profile)
	const setProfile = useSession.setState

	const [name, setName] = useState(profile?.name ?? "")
	const [avatarUrl, setAvatarUrl] = useState<string | null>(
		profile?.avatarUrl ?? null,
	)
	const [saved, setSaved] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [currentPassword, setCurrentPassword] = useState("")
	const [newPassword, setNewPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [passwordError, setPasswordError] = useState<string | null>(null)

	const initial = useMemo(
		() => (name.trim().charAt(0) || "F").toUpperCase(),
		[name],
	)

	const dirty =
		name.trim().length > 1 &&
		(name.trim() !== (profile?.name ?? "") ||
			(avatarUrl ?? null) !== (profile?.avatarUrl ?? null))

	const passwordReady =
		currentPassword.length >= 6 &&
		PASSWORD_RULE.test(newPassword) &&
		newPassword === confirmPassword &&
		newPassword !== currentPassword

	const save = useMutation({
		mutationFn: () =>
			passengerServicesApi.updateProfile({
				name: name.trim(),
				avatarUrl: avatarUrl ?? undefined,
			}),
		onSuccess: (updated) => {
			setProfile({ profile: updated })
			setError(null)
			setSaved(true)
		},
		onError: () => {
			setSaved(false)
			setError("تعذر حفظ التغييرات، حاول مجدداً")
		},
	})

	const passwordChange = useMutation({
		mutationFn: () =>
			passengerServicesApi.changePassword(
				currentPassword,
				newPassword,
				true,
			),
		onSuccess: () => {
			setCurrentPassword("")
			setNewPassword("")
			setConfirmPassword("")
			setPasswordError(null)
			Alert.alert(
				"تم تغيير كلمة المرور",
				"تم إنهاء الجلسات الأخرى لحماية حسابك.",
			)
		},
		onError: () => {
			setPasswordError(
				"تعذر تغيير كلمة المرور. تحقق من كلمة المرور الحالية وحاول مجدداً.",
			)
		},
	})

	const changeAvatar = useCallback(async () => {
		const uri = await pickImageFromLibrary()
		if (!uri) return
		setAvatarUrl(uri)
		setSaved(false)
	}, [])

	return (
		<MenuScaffold
			title="حسابي"
			subtitle="عدّل بياناتك الشخصية وأمان الحساب"
			onBack={() => navigation.goBack()}
		>
			<Card centered>
				<Pressable
					onPress={changeAvatar}
					accessibilityRole="button"
					accessibilityLabel="تغيير صورة الحساب"
					style={({ pressed }) => [
						styles.avatarWrap,
						pressed && styles.dimmed,
					]}
				>
					<View style={styles.avatar}>
						{avatarUrl ? (
							<Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
						) : (
							<Text style={styles.initial}>{initial}</Text>
						)}
					</View>
					<View style={styles.avatarBadge}>
						<CameraIcon size={16} color={colors.black} />
					</View>
				</Pressable>
			</Card>

			<LabeledInput
				label="الاسم"
				value={name}
				onChangeText={(text) => {
					setName(text)
					setSaved(false)
				}}
				placeholder="اسمك الكامل"
				autoCapitalize="words"
				returnKeyType="done"
			/>

			<LabeledInput
				label="رقم الهاتف"
				value={profile?.phone ?? ""}
				editable={false}
				placeholder="—"
			/>

			{error ? <StatusMessage danger>{error}</StatusMessage> : null}
			{saved ? <StatusMessage>تم حفظ التغييرات</StatusMessage> : null}

			<PrimaryAction
				label="حفظ الملف الشخصي"
				onPress={() => save.mutate()}
				disabled={!dirty}
				loading={save.isPending}
			/>

			<SectionLabel>تغيير كلمة المرور</SectionLabel>
			<Card>
				<Text style={styles.note}>
					استخدم ثمانية أحرف على الأقل تتضمن حرفاً كبيراً وصغيراً ورقماً.
				</Text>
			</Card>
			<LabeledInput
				label="كلمة المرور الحالية"
				value={currentPassword}
				onChangeText={(value) => {
					setCurrentPassword(value)
					setPasswordError(null)
				}}
				secureTextEntry
				textContentType="password"
				autoCapitalize="none"
			/>
			<LabeledInput
				label="كلمة المرور الجديدة"
				value={newPassword}
				onChangeText={(value) => {
					setNewPassword(value)
					setPasswordError(null)
				}}
				secureTextEntry
				textContentType="newPassword"
				autoCapitalize="none"
			/>
			<LabeledInput
				label="تأكيد كلمة المرور الجديدة"
				value={confirmPassword}
				onChangeText={(value) => {
					setConfirmPassword(value)
					setPasswordError(null)
				}}
				secureTextEntry
				textContentType="newPassword"
				autoCapitalize="none"
				returnKeyType="done"
			/>
			{confirmPassword && newPassword !== confirmPassword ? (
				<StatusMessage danger>كلمتا المرور غير متطابقتين</StatusMessage>
			) : null}
			{passwordError ? (
				<StatusMessage danger>{passwordError}</StatusMessage>
			) : null}
			<PrimaryAction
				label="تغيير كلمة المرور"
				onPress={() => passwordChange.mutate()}
				disabled={!passwordReady}
				loading={passwordChange.isPending}
			/>
		</MenuScaffold>
	)
}

const styles = StyleSheet.create({
	dimmed: { opacity: 0.7 },
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
		fontSize: 38,
		color: colors.black,
	},
	avatarBadge: {
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
		borderColor: colors.black,
	},
	note: {
		...typography.body,
		color: colors.textSecondary,
		marginBottom: spacing.sm,
	},
})

export default AccountScreen
