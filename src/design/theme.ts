/**
 * flaminGO Design System — single source of truth.
 *
 * Identity: charcoal black + white + gold. Never pink.
 * Heetch-grade geometry: SMALL corner radii, tight shadows, dense type.
 *
 * The UI is "inverted" against the map:
 *   light map  -> black sheet / drawer surfaces
 *   dark  map  -> white sheet / drawer surfaces
 * Use `surfacesFor(themeName)` to get that inverted surface set.
 *
 * Never hardcode a colour, radius, spacing or duration inside a screen.
 */
import { Platform } from "react-native"

export const colors = {
	/** Primary brand gold. */
	gold: "#D4AF37",
	goldSoft: "#E8C766",
	goldDeep: "#A9821C",
	/** Charcoal black — the flaminGO ink. */
	black: "#111111",
	charcoal: "#161618",
	white: "#FFFFFF",
	offWhite: "#F6F6F7",
	lightGray: "#F1F1F2",

	/** Press feedback overlay. */
	pressed: "rgba(212,175,55,0.12)",
	pressedInk: "rgba(17,17,17,0.06)",
	/** Soft gold glow (pins, focus rings). */
	glow: "rgba(212,175,55,0.28)",
	/** The map's own "origin" blue dot (matches Google's user dot). */
	origin: "#1A73E8",
	originRing: "rgba(26,115,232,0.22)",

	textPrimary: "#111111",
	textSecondary: "rgba(17,17,17,0.55)",
	textOnDark: "#FFFFFF",
	textOnDarkSecondary: "rgba(255,255,255,0.58)",
	divider: "rgba(17,17,17,0.08)",
	dividerOnDark: "rgba(255,255,255,0.10)",
	scrim: "rgba(0,0,0,0.45)",
	danger: "#E5484D",
	transparent: "transparent",
} as const

/**
 * Inverted surface set. `mapTheme` is the CURRENT map theme:
 * light map -> dark surfaces, dark map -> light surfaces (Heetch behaviour).
 */
export type Surfaces = {
	/** Sheet / drawer background. */
	sheet: string
	/** Nested field / card inside the sheet. */
	field: string
	/** Pressed state for a nested field. */
	fieldPressed: string
	text: string
	textMuted: string
	divider: string
	/** Filled primary button on top of the sheet. */
	button: string
	onButton: string
	handle: string
}

const DARK_SURFACES: Surfaces = {
	sheet: colors.black,
	field: "#1C1C1E",
	fieldPressed: "#242427",
	text: colors.textOnDark,
	textMuted: colors.textOnDarkSecondary,
	divider: colors.dividerOnDark,
	button: colors.gold,
	onButton: colors.black,
	handle: "rgba(255,255,255,0.22)",
}

const LIGHT_SURFACES: Surfaces = {
	sheet: colors.white,
	field: colors.offWhite,
	fieldPressed: "#EAEAEC",
	text: colors.textPrimary,
	textMuted: colors.textSecondary,
	divider: colors.divider,
	button: colors.black,
	onButton: colors.white,
	handle: "rgba(17,17,17,0.18)",
}

/**
 * @param mapTheme the theme the MAP is currently drawn with.
 * @returns the inverted surface palette used by the sheet and the drawer.
 */
export const surfacesFor = (mapTheme: "light" | "dark"): Surfaces =>
	mapTheme === "light" ? DARK_SURFACES : LIGHT_SURFACES

/** Small, Heetch-like corners. No pills except avatars / dots. */
export const radius = {
	xs: 4,
	sm: 6,
	md: 8,
	lg: 10,
	xl: 12,
	/** Bottom sheet top corners — deliberately small. */
	sheet: 12,
	pill: 999,
} as const

/** 4pt base scale. */
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

export const iconSize = {
	sm: 16,
	md: 20,
	lg: 24,
	xl: 28,
} as const

/** Minimum accessible touch target. */
export const touchTarget = 52

export const typography = {
	display: {
		fontSize: 30,
		lineHeight: 36,
		fontWeight: "800",
		letterSpacing: -0.6,
	},
	/** "WHERE ARE YOU GOING?" — the loud collapsed-sheet headline. */
	headline: {
		fontSize: 26,
		lineHeight: 32,
		fontWeight: "800",
		letterSpacing: -0.4,
	},
	title: {
		fontSize: 20,
		lineHeight: 27,
		fontWeight: "700",
		letterSpacing: -0.2,
	},
	subtitle: {
		fontSize: 17,
		lineHeight: 24,
		fontWeight: "600",
	},
	body: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: "500",
	},
	caption: {
		fontSize: 12.5,
		lineHeight: 17,
		fontWeight: "500",
	},
	menuItem: {
		fontSize: 22,
		lineHeight: 29,
		fontWeight: "800",
		letterSpacing: -0.3,
	},
} as const

/** One shadow language. Deliberately light — Heetch uses very soft depth. */
export const shadows = {
	soft: Platform.select({
		ios: {
			shadowColor: "#000",
			shadowOpacity: 0.07,
			shadowRadius: 6,
			shadowOffset: { width: 0, height: 2 },
		},
		android: { elevation: 2 },
		default: {},
	})!,
	sheet: Platform.select({
		ios: {
			shadowColor: "#000",
			shadowOpacity: 0.16,
			shadowRadius: 16,
			shadowOffset: { width: 0, height: -4 },
		},
		android: { elevation: 14 },
		default: {},
	})!,
	floating: Platform.select({
		ios: {
			shadowColor: "#000",
			shadowOpacity: 0.16,
			shadowRadius: 10,
			shadowOffset: { width: 0, height: 4 },
		},
		android: { elevation: 6 },
		default: {},
	})!,
} as const

/**
 * Motion language. Every pin / sheet / drawer transition uses these so the
 * whole app feels like one object.
 */
export const motion = {
	fast: 130,
	base: 190,
	slow: 300,
	/** General purpose spring (sheet, drawer). */
	spring: { damping: 18, stiffness: 220, mass: 0.9 } as const,
	springSoft: { damping: 22, stiffness: 160, mass: 1 } as const,
	/** Pin take-off: quick, slightly eager. */
	pinLift: { damping: 14, stiffness: 320, mass: 0.7 } as const,
	/** Pin landing: the premium "settling onto the dot" spring. */
	pinLand: { damping: 15, stiffness: 190, mass: 1.1 } as const,
} as const

export const theme = {
	colors,
	surfacesFor,
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
