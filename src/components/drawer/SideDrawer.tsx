/**
 * SideDrawer — flaminGO side menu, rebuilt from scratch.
 *
 * • Background #111111, width 80% of the screen, slide animation (Reanimated).
 * • Gold X at the top: no circle, no shadow.
 * • Header: avatar, user name, phone number. Minimal and premium.
 * • Exactly four menu items: حسابي / محفطتي / رحلاتي / مساعدة.
 *   No Driver App button, promotions, theme switch, light mode, settings or
 *   bottom divider.
 * • Slides from the start edge in LTR and from the end edge in RTL.
 *
 * PURE UI: navigation is performed by the callbacks passed in props, so the
 * existing navigation architecture is untouched.
 */
import React, { useCallback, useEffect, useMemo } from "react"
import {
	BackHandler,
	I18nManager,
	Image,
	Pressable,
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
	radius,
	spacing,
	touchTarget,
	typography,
	motion,
} from "../../design/theme"
import { CloseIcon } from "../icons/Icons"

export type DrawerMenuKey = "account" | "wallet" | "trips" | "help"

export type SideDrawerProps = {
	visible: boolean
	onClose: () => void
	userName: string
	phoneNumber: string
	avatarUrl?: string | null
	/** Navigate — wired to the app's existing routes by the parent. */
	onSelect: (key: DrawerMenuKey) => void
	/** Optional localized labels (defaults are Arabic). */
	labels?: Partial<Record<DrawerMenuKey, string>>
}

const DEFAULT_LABELS: Record<DrawerMenuKey, string> = {
	account: "حسابي",
	wallet: "محفطتي",
	trips: "رحلاتي",
	help: "مساعدة",
}

const MENU_ORDER: DrawerMenuKey[] = ["account", "wallet", "trips", "help"]

const SideDrawer: React.FC<SideDrawerProps> = ({
	visible,
	onClose,
	userName,
	phoneNumber,
	avatarUrl,
	onSelect,
	labels,
}) => {
	const { width } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const drawerWidth = Math.round(width * 0.8)
	const rtl = I18nManager.isRTL
	/** Off-screen direction depends on writing direction. */
	const hiddenOffset = rtl ? drawerWidth : -drawerWidth

	/** 0 = closed, 1 = fully open. Drives slide + backdrop fade together. */
	const progress = useSharedValue(0)

	const menu = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])

	useEffect(() => {
		progress.value = visible
			? withSpring(1, motion.spring)
			: withTiming(0, {
					duration: motion.base,
					easing: Easing.out(Easing.cubic),
				})
	}, [visible, progress])

	/** Android hardware back closes the drawer first. */
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
					const dragged = Math.max(0, raw)
					progress.value = Math.max(0, 1 - dragged / drawerWidth)
				})
				.onEnd((event) => {
					const velocity = rtl ? event.velocityX : -event.velocityX
					const shouldClose = progress.value < 0.6 || velocity > 700
					if (shouldClose) {
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

	const backdropStyle = useAnimatedStyle(() => ({
		opacity: progress.value,
	}))

	if (!visible) return null

	return (
		<View style={StyleSheet.absoluteFill} pointerEvents="box-none">
			{/* Tap outside to dismiss */}
			<Animated.View style={[styles.backdrop, backdropStyle]}>
				<Pressable
					style={StyleSheet.absoluteFill}
					onPress={close}
					accessibilityRole="button"
					accessibilityLabel="Close menu"
				/>
			</Animated.View>

			<GestureDetector gesture={pan}>
				<Animated.View
					style={[
						styles.panel,
						rtl ? styles.panelEnd : styles.panelStart,
						{
							width: drawerWidth,
							paddingTop: insets.top + spacing.lg,
							paddingBottom: insets.bottom + spacing.xl,
						},
						panelStyle,
					]}
				>
					{/* Gold X — no circle, no shadow */}
					<Pressable
						onPress={close}
						hitSlop={16}
						accessibilityRole="button"
						accessibilityLabel="Close"
						style={({ pressed }) => [
							styles.close,
							pressed && styles.closePressed,
						]}
					>
						<CloseIcon size={iconSize.lg} color={colors.gold} />
					</Pressable>

					{/* Minimal premium header */}
					<View style={styles.header}>
						<View style={styles.avatar}>
							{avatarUrl ? (
								<Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
							) : (
								<Text style={styles.avatarInitial}>
									{userName?.trim()?.charAt(0)?.toUpperCase() || "F"}
								</Text>
							)}
						</View>
						<Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
							{userName}
						</Text>
						<Text style={styles.phone} numberOfLines={1}>
							{phoneNumber}
						</Text>
					</View>

					{/* Exactly four items */}
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
									pressed && styles.menuItemPressed,
								]}
							>
								<Text style={styles.menuLabel} numberOfLines={1}>
									{menu[key]}
								</Text>
							</Pressable>
						))}
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
		backgroundColor: colors.black,
		paddingHorizontal: spacing["2xl"],
	},
	panelStart: {
		left: 0,
		borderTopRightRadius: radius.sheet,
		borderBottomRightRadius: radius.sheet,
	},
	panelEnd: {
		right: 0,
		borderTopLeftRadius: radius.sheet,
		borderBottomLeftRadius: radius.sheet,
	},
	close: {
		width: touchTarget - 12,
		height: touchTarget - 12,
		alignItems: I18nManager.isRTL ? "flex-end" : "flex-start",
		justifyContent: "center",
		alignSelf: I18nManager.isRTL ? "flex-end" : "flex-start",
	},
	closePressed: {
		opacity: 0.6,
	},
	header: {
		marginTop: spacing.xl,
		marginBottom: spacing["4xl"],
		alignItems: I18nManager.isRTL ? "flex-end" : "flex-start",
	},
	avatar: {
		width: 68,
		height: 68,
		borderRadius: radius.pill,
		backgroundColor: "rgba(212,175,55,0.14)",
		borderWidth: 1.5,
		borderColor: colors.gold,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
		marginBottom: spacing.lg,
	},
	avatarImage: {
		width: "100%",
		height: "100%",
	},
	avatarInitial: {
		...typography.title,
		color: colors.gold,
	},
	name: {
		...typography.title,
		color: colors.textOnDark,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
		width: "100%",
	},
	phone: {
		...typography.body,
		color: colors.textOnDarkSecondary,
		marginTop: spacing.xs,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
		width: "100%",
	},
	menu: {
		gap: spacing.sm,
	},
	menuItem: {
		minHeight: touchTarget,
		justifyContent: "center",
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		marginHorizontal: -spacing.md,
	},
	menuItemPressed: {
		backgroundColor: colors.pressed,
	},
	menuLabel: {
		...typography.menuItem,
		color: colors.textOnDark,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
	},
})

export default SideDrawer
