/**
 * SideDrawer — flaminGO side menu, rebuilt from scratch.
 *
 * Heetch feel, flaminGO identity (charcoal / white / gold). Inverted against
 * the map exactly like the bottom sheet.
 *
 * Layout, top to bottom:
 *   • Profile card
 *       – avatar photo, or a circular gold avatar with the first letter of the
 *         name (Google style) when there is no photo
 *       – a small gold camera button pinned to the avatar to upload a new one
 *       – "محمد (125 رحلة)"  — name + trip count in parentheses
 *       – "★ 4.96 / 5"        — rating, straight from the server
 *   • Exactly five items: حسابي / محفظتي / رحلاتي / كوبوناتي / مساعدة
 *   • Bottom bar: language flags (🇩🇿 🇫🇷 🇬🇧) then the Light/Dark toggle
 *
 * PURE UI: every action is a callback, so navigation, the profile API and the
 * theme store stay exactly where they already are.
 */
import React, { useCallback, useEffect, useMemo } from "react"
import {
	BackHandler,
	I18nManager,
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native"
import Animated, {
	Easing,
	interpolate,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
	colors,
	iconSize,
	motion,
	radius,
	spacing,
	surfacesFor,
	touchTarget,
	typography,
} from "../../design/theme"
import {
	CameraIcon,
	CloseIcon,
	MoonIcon,
	StarIcon,
	SunIcon,
} from "../icons/Icons"
import { tr } from "../../core/i18n"
import { useMessages } from "../../core/use-messages"

export type DrawerMenuKey =
	| "account"
	| "wallet"
	| "trips"
	| "coupons"
	| "help"

export type DrawerLocale = "ar" | "fr" | "en"

/** Only these five, in this order. Nothing else is ever rendered. */
const MENU_ORDER: DrawerMenuKey[] = [
	"account",
	"wallet",
	"trips",
	"coupons",
	"help",
]

const LABEL_KEYS: Record<DrawerMenuKey, string> = {
	account: "drawer.account",
	wallet: "drawer.wallet",
	trips: "drawer.trips",
	coupons: "drawer.coupons",
	help: "drawer.help",
}

const FLAGS: Array<{ locale: DrawerLocale; flag: string }> = [
	{ locale: "ar", flag: "\uD83C\uDDE9\uD83C\uDDFF" },
	{ locale: "fr", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
	{ locale: "en", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
]

export type SideDrawerProps = {
	visible: boolean
	onClose: () => void
	/** Theme the MAP is drawn with — the drawer inverts it. */
	mapTheme: "light" | "dark"
	userName: string
	avatarUrl?: string | null
	/** Completed trips, shown in parentheses next to the name. */
	tripCount?: number | null
	/** Average rating from the server, e.g. 4.96. */
	rating?: number | null
	activeLocale?: DrawerLocale
	onSelect: (key: DrawerMenuKey) => void
	/** Opens the phone's image picker (implemented by the parent). */
	onChangeAvatar: () => void
	onChangeLocale: (locale: DrawerLocale) => void
	onToggleTheme: () => void
	/** Optional localized labels. */
	labels?: Partial<Record<DrawerMenuKey, string>>
	/** Localized "رحلة" word used inside the parentheses. */
	tripWord?: string
}

const AVATAR = 72

const SideDrawer: React.FC<SideDrawerProps> = ({
	visible,
	onClose,
	mapTheme,
	userName,
	avatarUrl,
	tripCount,
	rating,
	activeLocale = "ar",
	onSelect,
	onChangeAvatar,
	onChangeLocale,
	onToggleTheme,
	labels,
	tripWord,
}) => {
	const { width } = useWindowDimensions()
	const { messages } = useMessages()
	const insets = useSafeAreaInsets()
	const drawerWidth = Math.round(Math.min(width * 0.82, 340))
	const rtl = I18nManager.isRTL
	const hiddenOffset = rtl ? drawerWidth : -drawerWidth
	const surfaces = useMemo(() => surfacesFor(mapTheme), [mapTheme])
	const menu = useMemo(
		() => Object.fromEntries(
			MENU_ORDER.map((key) => [key, labels?.[key] ?? tr(messages, LABEL_KEYS[key])]),
		) as Record<DrawerMenuKey, string>,
		[labels, messages],
	)
	const resolvedTripWord = tripWord ?? tr(messages, "trips.singular")

	/** 0 = closed, 1 = fully open. Drives the slide and the backdrop together. */
	const progress = useSharedValue(0)

	useEffect(() => {
		progress.value = visible
			? withSpring(1, motion.spring)
			: withTiming(0, {
					duration: motion.base,
					easing: Easing.out(Easing.cubic),
				})
	}, [visible, progress])

	useEffect(() => {
		if (!visible) return undefined
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			onClose()
			return true
		})
		return () => sub.remove()
	}, [visible, onClose])

	const close = useCallback(() => onClose(), [onClose])

	/** Swipe toward the outer edge to dismiss. */
	const pan = useMemo(
		() =>
			Gesture.Pan()
				.activeOffsetX(rtl ? [-9999, 12] : [-12, 9999])
				.onUpdate((event) => {
					const raw = rtl ? event.translationX : -event.translationX
					progress.value = Math.max(0, 1 - Math.max(0, raw) / drawerWidth)
				})
				.onEnd((event) => {
					const velocity = rtl ? event.velocityX : -event.velocityX
					if (progress.value < 0.6 || velocity > 700) {
						progress.value = withTiming(
							0,
							{ duration: motion.fast, easing: Easing.out(Easing.cubic) },
							() => runOnJS(close)(),
						)
					} else {
						progress.value = withSpring(1, motion.spring)
					}
				}),
		[close, drawerWidth, progress, rtl],
	)

	const panelStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: interpolate(progress.value, [0, 1], [hiddenOffset, 0]) },
		],
	}))

	const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }))

	if (!visible) return null

	const initial = userName?.trim()?.charAt(0)?.toUpperCase() || "F"
	const nameLine =
		tripCount != null ? `${userName} (${tripCount} ${resolvedTripWord})` : userName

	return (
		<View style={StyleSheet.absoluteFill} pointerEvents="box-none">
			<Animated.View style={[styles.backdrop, backdropStyle]}>
				<Pressable
					style={StyleSheet.absoluteFill}
					onPress={close}
					accessibilityRole="button"
					accessibilityLabel={tr(messages, "drawer.closeMenu")}
				/>
			</Animated.View>

			<GestureDetector gesture={pan}>
				<Animated.View
					style={[
						styles.panel,
						rtl ? styles.panelEnd : styles.panelStart,
						{
							width: drawerWidth,
							backgroundColor: surfaces.sheet,
							paddingTop: insets.top + spacing.md,
							paddingBottom: insets.bottom + spacing.lg,
						},
						panelStyle,
					]}
				>
					{/* Gold X — no circle, no shadow */}
					<Pressable
						onPress={close}
						hitSlop={16}
						accessibilityRole="button"
						accessibilityLabel={tr(messages, "common.close")}
						style={({ pressed }) => [
							styles.close,
							pressed && styles.dimmed,
						]}
					>
						<CloseIcon size={iconSize.lg} color={colors.gold} />
					</Pressable>

					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.scroll}
					>
						{/* ── Profile card ────────────────────────────────────── */}
						<View
							style={[
								styles.profileCard,
								{
									backgroundColor: surfaces.field,
									borderColor: surfaces.divider,
								},
							]}
						>
							<View style={styles.avatarWrap}>
								<View style={styles.avatar}>
									{avatarUrl ? (
										<Image
											source={{ uri: avatarUrl }}
											style={styles.avatarImage}
										/>
									) : (
										<Text style={styles.avatarInitial}>{initial}</Text>
									)}
								</View>
								{/* Small gold button to upload a photo from the phone */}
								<Pressable
									onPress={onChangeAvatar}
									hitSlop={10}
									accessibilityRole="button"
									accessibilityLabel={tr(messages, "drawer.changePhoto")}
									style={({ pressed }) => [
										styles.avatarButton,
										{ borderColor: surfaces.field },
										pressed && styles.dimmed,
									]}
								>
									<CameraIcon size={14} color={colors.black} />
								</Pressable>
							</View>

							<Text
								style={[styles.name, { color: surfaces.text }]}
								numberOfLines={1}
							>
								{nameLine}
							</Text>

							{rating != null ? (
								<View style={styles.ratingRow}>
									<StarIcon size={14} color={colors.gold} />
									<Text style={[styles.rating, { color: surfaces.textMuted }]}>
										{Number(rating).toFixed(2)} / 5
									</Text>
								</View>
							) : null}
						</View>

						{/* ── Exactly five items ───────────────────────────────── */}
						<View style={styles.menu}>
							{MENU_ORDER.map((key) => (
								<Pressable
									key={key}
									onPress={() => {
										onSelect(key)
										close()
									}}
									android_ripple={{ color: colors.pressed }}
									accessibilityRole="button"
									style={({ pressed }) => [
										styles.menuItem,
										pressed && { backgroundColor: surfaces.fieldPressed },
									]}
								>
									<Text
										style={[styles.menuLabel, { color: surfaces.text }]}
										numberOfLines={1}
									>
										{menu[key]}
									</Text>
								</Pressable>
							))}
						</View>
					</ScrollView>

					{/* ── Bottom bar: language flags, then the theme toggle ──────── */}
					<View
						style={[styles.bottomBar, { borderTopColor: surfaces.divider }]}
					>
						<View style={styles.flags}>
							{FLAGS.map(({ locale, flag }) => (
								<Pressable
									key={locale}
									onPress={() => onChangeLocale(locale)}
									hitSlop={8}
									accessibilityRole="button"
									accessibilityLabel={locale}
									style={({ pressed }) => [
										styles.flagButton,
										{ borderColor: "transparent" },
										locale === activeLocale && styles.flagActive,
										pressed && styles.dimmed,
									]}
								>
									<Text style={styles.flag}>{flag}</Text>
								</Pressable>
							))}
						</View>

						<Pressable
							onPress={onToggleTheme}
							accessibilityRole="button"
							accessibilityLabel={tr(messages, "drawer.changeTheme")}
							style={({ pressed }) => [
								styles.themeButton,
								{
									backgroundColor: surfaces.field,
									borderColor: surfaces.divider,
								},
								pressed && styles.dimmed,
							]}
						>
							{mapTheme === "light" ? (
								<MoonIcon size={iconSize.sm} color={colors.gold} />
							) : (
								<SunIcon size={iconSize.sm} color={colors.gold} />
							)}
							<Text style={[styles.themeLabel, { color: surfaces.text }]}>
								{tr(messages, mapTheme === "light" ? "theme.dark" : "theme.light")}
							</Text>
						</Pressable>
					</View>
				</Animated.View>
			</GestureDetector>
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: colors.scrim,
	},
	panel: {
		position: "absolute",
		top: 0,
		bottom: 0,
		paddingHorizontal: spacing.xl,
	},
	panelStart: { left: 0 },
	panelEnd: { right: 0 },
	close: {
		width: touchTarget - 14,
		height: touchTarget - 14,
		alignItems: I18nManager.isRTL ? "flex-end" : "flex-start",
		justifyContent: "center",
		alignSelf: I18nManager.isRTL ? "flex-end" : "flex-start",
	},
	dimmed: { opacity: 0.6 },
	scroll: {
		paddingBottom: spacing.xl,
	},
	profileCard: {
		borderRadius: radius.lg,
		borderWidth: StyleSheet.hairlineWidth,
		paddingVertical: spacing.xl,
		paddingHorizontal: spacing.lg,
		alignItems: "center",
		marginTop: spacing.sm,
		marginBottom: spacing["2xl"],
	},
	avatarWrap: {
		width: AVATAR,
		height: AVATAR,
		marginBottom: spacing.md,
	},
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
	avatarInitial: {
		...typography.display,
		fontSize: 30,
		color: colors.black,
	},
	avatarButton: {
		position: "absolute",
		bottom: -2,
		insetInlineEnd: -2,
		width: 26,
		height: 26,
		borderRadius: radius.pill,
		borderWidth: 2,
		backgroundColor: colors.gold,
		alignItems: "center",
		justifyContent: "center",
	},
	name: {
		...typography.title,
		textAlign: "center",
	},
	ratingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
		marginTop: spacing.xs,
	},
	rating: {
		...typography.caption,
		fontWeight: "700",
	},
	menu: {
		gap: spacing.xs,
	},
	menuItem: {
		minHeight: touchTarget,
		justifyContent: "center",
		borderRadius: radius.sm,
		paddingHorizontal: spacing.sm,
	},
	menuLabel: {
		...typography.menuItem,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
	},
	bottomBar: {
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: spacing.lg,
		gap: spacing.md,
	},
	flags: {
		flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
		gap: spacing.sm,
	},
	flagButton: {
		width: 40,
		height: 32,
		borderRadius: radius.sm,
		borderWidth: 1.5,
		alignItems: "center",
		justifyContent: "center",
	},
	flagActive: {
		borderColor: colors.gold,
		backgroundColor: colors.pressed,
	},
	flag: { fontSize: 19 },
	themeButton: {
		height: 42,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.sm,
	},
	themeLabel: {
		...typography.body,
		fontWeight: "700",
	},
})

export default React.memo(SideDrawer)
