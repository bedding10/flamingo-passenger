// src/core/theme.ts - WRAPPER ONLY.
//
// Every colour in the passenger app now comes from `src/design/theme.ts`.
// This file defines NO palette of its own: it only reshapes the canonical
// tokens into the `Palette` object that ~16 existing screens already import,
// so none of them needed an import change.
//
// Screens must NEVER hardcode a literal #RRGGBB value.
import { colors } from "../design/theme";

export type ThemeName = "light" | "dark";
export type ThemeMode = ThemeName | "system";

export type Palette = {
  bg: string; // main background
  surface: string; // cards / sheets
  surfaceAlt: string; // inputs
  text: string; // primary text
  textMuted: string; // secondary text
  border: string; // borders / dividers
  primary: string; // primary button (ink in light, white in dark)
  onPrimary: string; // text on top of the primary button
  accent: string; // gold - flaminGO signature accent
  onAccent: string; // text / icons drawn on top of the gold accent
  routeBase: string; // calm grey base stroke of the route line
  routeGlow: string; // travelling light that runs along the gold route
  danger: string;
  mapStyle: "standard" | "night";
};

/** Neutral greys of the route polyline. Not brand colours, map geometry only. */
const ROUTE_BASE_LIGHT = "#B9BEC6";
const ROUTE_BASE_DARK = "#454A54";

export const LIGHT: Palette = {
  bg: colors.white,
  surface: colors.white,
  surfaceAlt: colors.offWhite,
  text: colors.textOnLight,
  textMuted: colors.textOnLightMuted,
  border: colors.dividerOnLight,
  primary: colors.ink,
  onPrimary: colors.white,
  accent: colors.gold,
  onAccent: colors.white,
  routeBase: ROUTE_BASE_LIGHT,
  routeGlow: colors.goldSoft,
  danger: colors.danger,
  mapStyle: "standard",
};

export const DARK: Palette = {
  bg: colors.ink,
  surface: colors.surfaceDark,
  surfaceAlt: colors.surfaceDark,
  text: colors.textOnDark,
  textMuted: colors.textOnDarkMuted,
  border: colors.divider,
  primary: colors.white,
  onPrimary: colors.ink,
  accent: colors.gold,
  onAccent: colors.white,
  routeBase: ROUTE_BASE_DARK,
  routeGlow: colors.goldSoft,
  danger: colors.danger,
  mapStyle: "night",
};

export const PALETTES: Record<ThemeName, Palette> = {
  light: LIGHT,
  dark: DARK,
};

export const paletteFor = (name: ThemeName): Palette => PALETTES[name] ?? LIGHT;

// Translucent overlays used for the floating map buttons. Derived from the
// two canonical blacks / white, never a new colour.
export const overlayFor = (name: ThemeName) =>
  name === "dark" ? "rgba(28,30,34,0.82)" : "rgba(255,255,255,0.92)";

/**
 * Applies an alpha channel to a palette colour so overlays and the glowing
 * route line stay palette-driven (no literal colours in feature code).
 */
export function withAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const hex = color.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return color;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

// Google Maps JSON styles below are MAP GEOMETRY, not UI surfaces: Google
// requires literal colour strings in the style array, so they legitimately
// stay here (the raw-hex audit excludes this file).

export const NIGHT_MAP_JSON = [
  { elementType: "geometry", stylers: [{ color: "#1C1E22" }] },
  // Rich map: shop / mall / landmark icons and names stay visible so the map
  // never looks empty (Heetch-like level of detail).
  { elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#C9CCD2" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#121417" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#2A2D33" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#C9CCD2" }],
  },
  { featureType: "poi", stylers: [{ visibility: "on" }] },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#191B1F" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#B9BEC6" }],
  },
  // Shops, malls, restaurants and services: kept on, but neutral grey. Gold is
  // reserved for the route, the pins and the UI - never for a map label.
  { featureType: "poi.business", stylers: [{ visibility: "on" }] },
  {
    featureType: "poi.business",
    elementType: "labels.text.fill",
    stylers: [{ color: "#B9BEC6" }],
  },
  {
    featureType: "poi.attraction",
    elementType: "labels.text.fill",
    stylers: [{ color: "#B9BEC6" }],
  },
  {
    featureType: "poi.medical",
    elementType: "labels.text.fill",
    stylers: [{ color: "#E6B8B0" }],
  },
  {
    featureType: "poi.school",
    elementType: "labels.text.fill",
    stylers: [{ color: "#AFC3D8" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#14231A" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8FB79A" }],
  },
  // Route-number shields (W94, N60 ...) are the only coloured thing left on
  // an otherwise monochrome map, so they are hidden in BOTH styles.
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2E3138" }] },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#121417" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8B9099" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3C4048" }],
  },
  { featureType: "transit", stylers: [{ visibility: "on" }] },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1E1E22" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#AFB5BE" }],
  },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#070C14" }] },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4B5058" }],
  },
] as const;


// Very light day map: near-white land, grey roads, muted labels — the bottom
// card stays the loudest element on screen.
export const DAY_MAP_JSON = [
  { elementType: "geometry", stylers: [{ color: "#F6F6F7" }] },
  // Rich map: POI icons stay visible so shops and landmarks are readable.
  { elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5F656E" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#E4E5E8" }] },
  { featureType: "poi", stylers: [{ visibility: "on" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#EFEFF1" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6B7280" }] },
  { featureType: "poi.business", stylers: [{ visibility: "on" }] },
  {
    featureType: "poi.business",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8A6D1F" }],
  },
  {
    featureType: "poi.attraction",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8A6D1F" }],
  },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#E4EDE3" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#5C8767" }] },
  // Route-number shields (W94, N60 ...) are the only coloured thing left on
  // an otherwise monochrome map, so they are hidden in BOTH styles.
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#E6E7EA" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9AA0A9" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#FDFDFD" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#EFEFF1" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#DFE0E4" }] },
  { featureType: "transit", stylers: [{ visibility: "on" }] },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6B7280" }],
  },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#DDE3EA" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#A7AEB8" }] },
] as const;

// Returns the Google Maps style array for the active palette. Kept here so the
// map never carries literal colours inside feature code.
export const mapStyleFor = (style: Palette["mapStyle"]) =>
  (style === "night" ? NIGHT_MAP_JSON : DAY_MAP_JSON) as unknown as Array<
    Record<string, unknown>
  >;
