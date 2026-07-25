// Single source of truth for every colour in the passenger app.
//
// Visual identity: pure black & white + neutral grey, with gold (#D9A520) used
// only as a rare accent (logo / small details). Screens must NEVER hardcode a
// literal #RRGGBB value: they read symbolic keys from the active `Palette`.

export type ThemeName = "light" | "dark";
export type ThemeMode = ThemeName | "system";

export type Palette = {
  bg: string; // main background
  surface: string; // cards / sheets
  surfaceAlt: string; // inputs
  text: string; // primary text
  textMuted: string; // secondary text
  border: string; // borders / dividers
  primary: string; // primary button (black in light, white in dark)
  onPrimary: string; // text on top of the primary button
  accent: string; // gold — rare accent only
  danger: string;
  mapStyle: "standard" | "night";
};

export const LIGHT: Palette = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F4F5",
  text: "#0E0E10",
  textMuted: "#6B7280",
  border: "#ECECEC",
  primary: "#0E0E10",
  onPrimary: "#FFFFFF",
  accent: "#D9A520",
  danger: "#B42318",
  mapStyle: "standard",
};

export const DARK: Palette = {
  bg: "#0B0B0C",
  surface: "#151517",
  surfaceAlt: "#1E1E22",
  text: "#F5F5F6",
  textMuted: "#9AA0A9",
  border: "#26262B",
  primary: "#FFFFFF",
  onPrimary: "#0B0B0C",
  accent: "#D9A520",
  danger: "#F97066",
  mapStyle: "night",
};

export const PALETTES: Record<ThemeName, Palette> = {
  light: LIGHT,
  dark: DARK,
};

export const paletteFor = (name: ThemeName): Palette => PALETTES[name] ?? LIGHT;

// Translucent overlays used for the floating map buttons. Derived from the
// palette identity (black / white only), never a new colour.
export const overlayFor = (name: ThemeName) =>
  name === "dark" ? "rgba(11,11,12,0.82)" : "rgba(255,255,255,0.92)";

// Minimal black / grey Google Maps style used when `palette.mapStyle` is
// "night": black streets over a very dark neutral background, labels dimmed.
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

export const NIGHT_MAP_JSON = [
  { elementType: "geometry", stylers: [{ color: "#0B0B0C" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9AA0A9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0B0B0C" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#26262B" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#C9CCD2" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6B7280" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#151517" }],
  },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1E1E22" }] },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0B0B0C" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8B9099" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2C2C31" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1E1E22" }],
  },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#08080A" }] },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4B5058" }],
  },
] as const;
