/**
 * flaminGO Design System — single source of truth.
 * Premium ride-hailing visual language (inspired by Heetch, branded flaminGO).
 *
 * Never hardcode a color, radius, spacing or duration in a screen.
 * Always import from here so every screen stays visually identical.
 */
import { Platform } from "react-native"

export const colors = {
	/** Primary brand gold */
	gold: "#D4AF37",
	/** Background black */
	black: "#111111",
	white: "#FFFFFF",
	lightGray: "#F5F5F5",
	/** Press feedback overlay */
	pressed: "rgba(212,175,55,0.12)",
	/** Soft gold glow (pins, focus rings) */
	glow: "rgba(212,175,55,0.35)",

	// Derived neutrals (kept intentionally tiny)
	textPrimary: "#111111",
	textSecondary: "rgba(17,17,17,0.55)",
	textOnDark: "#FFFFFF",
	textOnDarkSecondary: "rgba(255,255,255,0.55)",
	divider: "rgba(17,17,17,0.08)",
	dividerOnDark: "rgba(255,255,255,0.10)",
	scrim: "rgba(0,0,0,0.45)",
	transparent: "transparent",
} as const

/** Large rounded corners everywhere. */
export const radius = {
	sm: 12,
	md: 16,
	lg: 20,
	xl: 28,
	sheet: 32,
	pill: 999,
} as const

/** 4pt base scale — premium, airy spacing. */
export const spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	"2xl": 24,
	"3xl": 32,
	"4xl": 40,
} as const

/** Consistent icon sizing. */
export const iconSize = {
	sm: 18,
	md: 22,
	lg: 26,
	xl: 32,
} as const

/** Minimum accessible / premium touch target. */
export const touchTarget = 56

export const typography = {
	display: {
		fontSize: 30,
		lineHeight: 38,
		fontWeight: "800",
		letterSpacing: -0.4,
	},
	title: {
		fontSize: 22,
		lineHeight: 30,
		fontWeight: "700",
		letterSpacing: -0.2,
	},
	subtitle: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: "600",
	},
	body: {
		fontSize: 16,
		lineHeight: 24,
		fontWeight: "500",
	},
	caption: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "500",
	},
	menuItem: {
		fontSize: 21,
		lineHeight: 28,
		fontWeight: "700",
		letterSpacing: -0.2,
	},
} as const

/** One shadow language for the whole app. */
export const shadows = {
	soft: Platform.select({
		ios: {
			shadowColor: "#000",
			shadowOpacity: 0.08,
			shadowRadius: 12,
			shadowOffset: { width: 0, height: 4 },
		},
		android: { elevation: 4 },
		default: {},
	})!,
	sheet: Platform.select({
		ios: {
			shadowColor: "#000",
			shadowOpacity: 0.14,
			shadowRadius: 24,
			shadowOffset: { width: 0, height: -6 },
		},
		android: { elevation: 16 },
		default: {},
	})!,
	floating: Platform.select({
		ios: {
			shadowColor: "#000",
			shadowOpacity: 0.18,
			shadowRadius: 18,
			shadowOffset: { width: 0, height: 8 },
		},
		android: { elevation: 10 },
		default: {},
	})!,
} as const

/** Same animation timing across every interaction. */
export const motion = {
	fast: 140,
	/** Canonical pin fade / scale duration. */
	base: 200,
	slow: 320,
	/** Reanimated withSpring config for sheets, drawer, pins. */
	spring: { damping: 18, stiffness: 220, mass: 0.9 } as const,
	springSoft: { damping: 22, stiffness: 160, mass: 1 } as const,
} as const

export const theme = {
	colors,
	radius,
	spacing,
	iconSize,
	touchTarget,
	typography,
	shadows,
	motion,
} as const

export type Theme = typeof theme
export default theme
