/**
 * flaminGO Design System - THE single source of truth for colour, radius,
 * spacing, type, shadow and motion.
 *
 * Identity: charcoal ink + white + gold. Never pink, never blue, never green.
 * The only exception is `colors.origin`, Google's standard "you are here" blue
 * dot, which users expect on any map.
 *
 * `src/core/theme.ts` is now a thin wrapper that re-exports values derived from
 * this file. No other file may define a literal #RRGGBB.
 */
import { Platform } from "react-native";

export const colors = {
  /* Gold: the one and only brand accent. */
  /** Canonical brand gold (was #D4AF37 here and #D9A520 in core/theme). */
  gold: "#D9A520",
  /** Soft gold - hover / disabled / glow. */
  goldSoft: "#E8C766",
  /** Deep gold - icon or text needing more contrast on a light surface. */
  goldDeep: "#B8860B",
  /** Accessible gold text on a white background. */
  goldOnLight: "#8A6A14",

  /* Exactly two blacks. No more. */
  /** The single charcoal ink: backgrounds, and text on white. */
  ink: "#1C1E22",
  /** The single raised surface above the ink: cards, fields, the sheet. */
  surfaceDark: "#26292E",

  white: "#FFFFFF",
  /** Alternative light background (never used on the map itself). */
  offWhite: "#F6F6F7",

  textOnDark: "#FFFFFF",
  textOnDarkMuted: "rgba(255,255,255,0.60)",
  textOnLight: "#1C1E22",
  textOnLightMuted: "rgba(28,30,34,0.55)",

  divider: "rgba(255,255,255,0.10)",
  dividerOnLight: "rgba(28,30,34,0.08)",
  scrim: "rgba(0,0,0,0.55)",

  /** Google's user-location blue. Deliberate, documented exception. */
  origin: "#1A73E8",
  originRing: "rgba(26,115,232,0.22)",

  danger: "#E5484D",
  transparent: "transparent",

  /* Press feedback, derived from the palette above. */
  /** Gold press overlay (ripple on dark surfaces). */
  pressed: "rgba(217,165,32,0.12)",
  /** Ink press overlay (ripple on light surfaces). */
  pressedInk: "rgba(28,30,34,0.06)",
  /** Soft gold glow (pins, focus rings). */
  glow: "rgba(217,165,32,0.28)",

  /* Backwards-compatible aliases.
   * Kept so every existing screen keeps compiling. They are ALIASES: each one
   * resolves to a value above, so the app can never show a third black or a
   * second gold again. Prefer the canonical names in new code.
   */
  /** @deprecated use `ink` */
  black: "#1C1E22",
  /** @deprecated use `surfaceDark` */
  charcoal: "#26292E",
  /** @deprecated use `offWhite` */
  lightGray: "#F6F6F7",
  /** @deprecated use `textOnLight` */
  textPrimary: "#1C1E22",
  /** @deprecated use `textOnLightMuted` */
  textSecondary: "rgba(28,30,34,0.55)",
  /** @deprecated use `textOnDarkMuted` */
  textOnDarkSecondary: "rgba(255,255,255,0.60)",
  /** @deprecated use `divider` */
  dividerOnDark: "rgba(255,255,255,0.10)",
} as const;

/**
 * Inverted surface set. `mapTheme` is the CURRENT map theme:
 * light map -> dark surfaces, dark map -> light surfaces.
 */
export type Surfaces = {
  /** Sheet / drawer background. */
  sheet: string;
  /** Nested field / card inside the sheet. */
  field: string;
  /** Pressed state for a nested field. */
  fieldPressed: string;
  text: string;
  textMuted: string;
  divider: string;
  /** Filled primary button on top of the sheet. */
  button: string;
  onButton: string;
  handle: string;
};

const DARK_SURFACES: Surfaces = {
  sheet: colors.ink,
  field: colors.surfaceDark,
  fieldPressed: "rgba(255,255,255,0.06)",
  text: colors.textOnDark,
  textMuted: colors.textOnDarkMuted,
  divider: colors.divider,
  button: colors.gold,
  onButton: colors.ink,
  handle: "rgba(255,255,255,0.22)",
};

const LIGHT_SURFACES: Surfaces = {
  sheet: colors.white,
  field: colors.offWhite,
  fieldPressed: "rgba(28,30,34,0.05)",
  text: colors.textOnLight,
  textMuted: colors.textOnLightMuted,
  divider: colors.dividerOnLight,
  button: colors.ink,
  onButton: colors.white,
  handle: "rgba(28,30,34,0.18)",
};

/**
 * @param mapTheme the theme the MAP is currently drawn with.
 * @returns the inverted surface palette used by the drawer.
 */
export const surfacesFor = (mapTheme: "light" | "dark"): Surfaces =>
  mapTheme === "light" ? DARK_SURFACES : LIGHT_SURFACES;

/**
 * NON-inverted surface set: the bottom sheet follows the APP theme. Only two
 * blacks exist, so the night sheet is `ink` with `surfaceDark` fields.
 */
export const sheetSurfacesFor = (mode: "light" | "dark"): Surfaces =>
  mode === "dark" ? DARK_SURFACES : LIGHT_SURFACES;

/**
 * Corner radii.
 *
 * A primary CTA is ALWAYS a pill (`radius.pill`). Cards and fields use
 * `radius.card`. No arbitrary in-between values.
 */
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  /** Cards: vehicle classes, route rows, panels. */
  card: 16,
  /** @deprecated alias of `card`, kept for existing imports. */
  xl: 16,
  /** Top corners of the bottom sheet / bottom banner. */
  sheet: 20,
  /** Primary CTA, filter chips, circular controls. Mandatory for CTAs. */
  pill: 999,
} as const;

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
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

/** Minimum accessible touch target. */
export const touchTarget = 52;

/**
 * Type scale.
 *
 * IMPORTANT - no `fontFamily` is baked in here. Poppins has no Arabic glyphs
 * and Arabic is the app's primary language, so the family is applied at render
 * time for Latin locales only, via `useLatinType()` in `src/core/typeface.ts`.
 * The weights below keep headings heavy on the Arabic system face too.
 */
export const typography = {
  /** Huge banner headline: "WHERE ARE YOU GOING?" / "YOUR ROUTE". */
  banner: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  headline: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  /** Side-drawer entries. */
  menuItem: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
  caption: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "600",
  },
} as const;

export type TypeToken = keyof typeof typography;

/** One shadow language. Deliberately light. */
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
} as const;

/** Motion language shared by every pin / sheet / drawer transition. */
export const motion = {
  fast: 130,
  base: 190,
  slow: 300,
  /** General purpose spring (sheet, drawer). */
  spring: { damping: 18, stiffness: 220, mass: 0.9 } as const,
  springSoft: { damping: 22, stiffness: 160, mass: 1 } as const,
  /** Pin take-off: quick, slightly eager. */
  pinLift: { damping: 14, stiffness: 320, mass: 0.7 } as const,
  /** Pin landing: the premium settling spring. */
  pinLand: { damping: 15, stiffness: 190, mass: 1.1 } as const,
} as const;

export const theme = {
  colors,
  surfacesFor,
  sheetSurfacesFor,
  radius,
  spacing,
  iconSize,
  touchTarget,
  typography,
  shadows,
  motion,
} as const;

export type Theme = typeof theme;
export default theme;
