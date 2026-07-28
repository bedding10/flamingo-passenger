/**
 * حسابي — Account page (drawer item 1).
 *
 * Name + avatar are saved through the EXISTING endpoint
 * `passengerServicesApi.updateProfile` (PATCH /passenger/me). No new logic, no
 * new endpoint, no new payload field.
 *
 * Phone number and password are rendered because the product asks for them,
 * but they are verification-bound (Firebase phone auth) and the current backend
 * exposes no mutation for either, so they stay read-only instead of calling an
 * endpoint that does not exist.
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
	GhostAction,
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

export function AccountScreen({ navigation }: Props) {
	const profile = useSession((state) => state.profile)
	const setProfile = useSession.setState

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

	const changeAvatar = useCallback(async () => {
		const uri = await pickImageFromLibrary()
		if (!uri) return
		setAvatarUrl(uri)
		setSaved(false)
	}, [])

	return (
		<MenuScaffold
			title="حسابي"
			subtitle="عدّل بياناتك الشخصية"
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

			<SectionLabel>الأمان</SectionLabel>
			<Card>
				<Text style={styles.note}>
					تغيير رقم الهاتف أو كلمة المرور يتطلّب إعادة التحقق من الهوية.
				</Text>
				<GhostAction
					label="طلب تغيير رقم الهاتف / كلمة المرور"
					onPress={() =>
						Alert.alert(
							"إعادة التحقق مطلوبة",
							"أرسل لنا الطلب من صفحة المساعدة وسنعالجه.",
							[
								{ text: "إلغاء", style: "cancel" },
								{
									text: "فتح المساعدة",
									onPress: () => navigation.navigate("Support"),
								},
							],
						)
					}
				/>
			</Card>

			{error ? <StatusMessage danger>{error}</StatusMessage> : null}
			{saved ? <StatusMessage>تم حفظ التغييرات</StatusMessage> : null}

			<PrimaryAction
				label="حفظ"
				onPress={() => save.mutate()}
				disabled={!dirty}
				loading={save.isPending}
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
