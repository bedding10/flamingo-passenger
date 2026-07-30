/**
 * MenuScaffold — the shared shell of the five drawer pages
 * (حسابي / محفظتي / رحلاتي / كوبوناتي / مساعدة).
 *
 * One shell for all of them so the pages feel like a single product: charcoal
 * or white surface driven by the active theme, gold accents, small radii, a
 * flat back chevron and a large page title. Replaces the old generic `Screen`
 * wrapper for these routes.
 *
 * Also exports the premium primitives those pages share (Card, LabeledInput,
 * PrimaryAction, GhostAction, InfoRow, StatusMessage) so no page re-invents a
 * button or an input.
 */
import React from "react"
import {
	ActivityIndicator,
	I18nManager,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
	type TextInputProps,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
	colors,
	iconSize,
	radius,
	spacing,
	surfacesFor,
	touchTarget,
	typography,
	type Surfaces,
} from "../../design/theme"
import { ChevronIcon } from "../icons/Icons"
import { useTheme } from "../../core/theme-store"
import { tr } from "../../core/i18n"
import { useMessages } from "../../core/use-messages"

/** Resolves the surface set used by every drawer page. */
export function useMenuSurfaces(): Surfaces {
	const { name } = useTheme()
	return surfacesFor(name === "dark" ? "dark" : "light")
}

export type MenuScaffoldProps = {
	title: string
	subtitle?: string
	onBack: () => void
	loading?: boolean
	children: React.ReactNode
}

export const MenuScaffold: React.FC<MenuScaffoldProps> = ({
	title,
	subtitle,
	onBack,
	loading = false,
	children,
}) => {
	const insets = useSafeAreaInsets()
	const { messages } = useMessages()
	const { palette } = useTheme()
	const surfaces = useMenuSurfaces()

	return (
		<View style={[styles.root, { backgroundColor: palette.bg }]}>
			<View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
				<Pressable
					onPress={onBack}
					hitSlop={14}
					accessibilityRole="button"
					accessibilityLabel={tr(messages, "common.back")}
					style={({ pressed }) => [styles.back, pressed && styles.dimmed]}
				>
					<ChevronIcon
						size={iconSize.lg}
						color={colors.gold}
						direction={I18nManager.isRTL ? "right" : "left"}
					/>
				</Pressable>
				<Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
					{title}
				</Text>
				{subtitle ? (
					<Text style={[styles.subtitle, { color: palette.textMuted }]}>
						{subtitle}
					</Text>
				) : null}
			</View>

			<KeyboardAvoidingView
				style={styles.flex}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				{loading ? (
					<View style={styles.loading}>
						<ActivityIndicator color={colors.gold} />
					</View>
				) : (
					<ScrollView
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						contentContainerStyle={[
							styles.content,
							{ paddingBottom: insets.bottom + spacing["4xl"] },
						]}
					>
						{children}
					</ScrollView>
				)}
			</KeyboardAvoidingView>
		</View>
	)
}

/** Flat surface block used to group related content. */
export const Card: React.FC<{
	children: React.ReactNode
	centered?: boolean
}> = ({ children, centered }) => {
	const surfaces = useMenuSurfaces()
	const { palette } = useTheme()
	return (
		<View
			style={[
				styles.card,
				{
					backgroundColor: palette.surfaceAlt,
					borderColor: palette.border,
				},
				centered && styles.cardCentered,
			]}
		>
			{children}
		</View>
	)
}

export type LabeledInputProps = TextInputProps & {
	label: string
	/** Renders a tall multi-line box (help message). */
	area?: boolean
}

export const LabeledInput: React.FC<LabeledInputProps> = ({
	label,
	area = false,
	style,
	...rest
}) => {
	const { palette } = useTheme()
	return (
		<View style={styles.fieldBlock}>
			<Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
				{label}
			</Text>
			<TextInput
				placeholderTextColor={palette.textMuted}
				multiline={area}
				textAlignVertical={area ? "top" : "center"}
				style={[
					styles.input,
					area && styles.textArea,
					{
						color: palette.text,
						backgroundColor: palette.surfaceAlt,
						borderColor: palette.border,
					},
					style,
				]}
				{...rest}
			/>
		</View>
	)
}

export const PrimaryAction: React.FC<{
	label: string
	onPress: () => void
	disabled?: boolean
	loading?: boolean
	leading?: React.ReactNode
}> = ({ label, onPress, disabled, loading, leading }) => (
	<Pressable
		onPress={onPress}
		disabled={disabled || loading}
		accessibilityRole="button"
		android_ripple={{ color: "rgba(0,0,0,0.12)" }}
		style={({ pressed }) => [
			styles.primary,
			(disabled || loading) && styles.disabled,
			pressed && styles.dimmed,
		]}
	>
		{loading ? (
			<ActivityIndicator color={colors.black} />
		) : (
			<>
				{leading}
				<Text style={styles.primaryLabel}>{label}</Text>
			</>
		)}
	</Pressable>
)

export const GhostAction: React.FC<{
	label: string
	onPress: () => void
	leading?: React.ReactNode
	disabled?: boolean
}> = ({ label, onPress, leading, disabled }) => {
	const { palette } = useTheme()
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			android_ripple={{ color: colors.pressed }}
			style={({ pressed }) => [
				styles.ghost,
				{ borderColor: colors.gold },
				disabled && styles.disabled,
				pressed && styles.dimmed,
			]}
		>
			{leading}
			<Text style={[styles.ghostLabel, { color: palette.text }]}>{label}</Text>
		</Pressable>
	)
}

export const InfoRow: React.FC<{
	title: string
	subtitle?: string
	value?: string
	onPress?: () => void
}> = ({ title, subtitle, value, onPress }) => {
	const { palette } = useTheme()
	const body = (
		<View style={styles.infoRow}>
			<View style={styles.flex}>
				<Text style={[styles.infoTitle, { color: palette.text }]}>{title}</Text>
				{subtitle ? (
					<Text style={[styles.infoSubtitle, { color: palette.textMuted }]}>
						{subtitle}
					</Text>
				) : null}
			</View>
			{value ? (
				<Text style={[styles.infoValue, { color: colors.gold }]}>{value}</Text>
			) : null}
		</View>
	)
	if (!onPress) return body
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			android_ripple={{ color: colors.pressed }}
			style={({ pressed }) => [pressed && styles.dimmed]}
		>
			{body}
		</Pressable>
	)
}

export const StatusMessage: React.FC<{
	children: React.ReactNode
	danger?: boolean
}> = ({ children, danger }) => (
	<View
		style={[
			styles.status,
			{
				borderColor: danger ? colors.danger : colors.gold,
				backgroundColor: danger
					? "rgba(229,72,77,0.10)"
					: "rgba(212,175,55,0.10)",
			},
		]}
	>
		<Text
			style={[
				styles.statusText,
				{ color: danger ? colors.danger : colors.gold },
			]}
		>
			{children}
		</Text>
	</View>
)

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { palette } = useTheme()
	return (
		<Text style={[styles.section, { color: palette.textMuted }]}>{children}</Text>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	flex: { flex: 1 },
	dimmed: { opacity: 0.65 },
	disabled: { opacity: 0.4 },
	header: {
		paddingHorizontal: spacing.xl,
		paddingBottom: spacing.lg,
		gap: spacing.xs,
	},
	back: {
		width: touchTarget - 14,
		height: touchTarget - 14,
		alignItems: I18nManager.isRTL ? "flex-end" : "flex-start",
		justifyContent: "center",
		alignSelf: I18nManager.isRTL ? "flex-end" : "flex-start",
	},
	title: {
		...typography.display,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
	},
	subtitle: {
		...typography.body,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
	},
	loading: { flex: 1, alignItems: "center", justifyContent: "center" },
	content: {
		paddingHorizontal: spacing.xl,
		gap: spacing.lg,
	},
	card: {
		borderRadius: radius.lg,
		borderWidth: StyleSheet.hairlineWidth,
		padding: spacing.lg,
		gap: spacing.sm,
	},
	cardCentered: { alignItems: "center" },
	fieldBlock: { gap: spacing.xs },
	fieldLabel: {
		...typography.caption,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		textAlign: I18nManager.isRTL ? "right" : "left",
	},
	input: {
		minHeight: touchTarget,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: spacing.md,
		...typography.subtitle,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
	},
	textArea: {
		minHeight: 160,
		paddingTop: spacing.md,
	},
	primary: {
		minHeight: touchTarget,
		borderRadius: radius.md,
		backgroundColor: colors.gold,
		flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.sm,
		paddingHorizontal: spacing.lg,
	},
	primaryLabel: {
		...typography.subtitle,
		fontWeight: "800",
		color: colors.black,
	},
	ghost: {
		minHeight: touchTarget,
		borderRadius: radius.md,
		borderWidth: 1.5,
		flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.sm,
		paddingHorizontal: spacing.lg,
	},
	ghostLabel: {
		...typography.subtitle,
		fontWeight: "700",
	},
	infoRow: {
		flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
		alignItems: "center",
		gap: spacing.md,
		paddingVertical: spacing.sm,
	},
	infoTitle: {
		...typography.body,
		fontWeight: "600",
		textAlign: I18nManager.isRTL ? "right" : "left",
	},
	infoSubtitle: {
		...typography.caption,
		textAlign: I18nManager.isRTL ? "right" : "left",
	},
	infoValue: {
		...typography.subtitle,
		fontWeight: "800",
	},
	status: {
		borderRadius: radius.md,
		borderWidth: 1,
		padding: spacing.md,
	},
	statusText: {
		...typography.body,
		fontWeight: "600",
		textAlign: I18nManager.isRTL ? "right" : "left",
	},
	section: {
		...typography.caption,
		fontWeight: "800",
		textTransform: "uppercase",
		letterSpacing: 0.6,
		marginTop: spacing.sm,
		textAlign: I18nManager.isRTL ? "right" : "left",
	},
})

export default MenuScaffold
