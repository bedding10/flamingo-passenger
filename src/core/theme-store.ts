// Persisted theme preference (light / dark / system) for the whole app.
//
// Default is "system": the app follows the OS colour scheme and reacts live to
// changes via Appearance. The menu exposes light / dark / auto.

import { useMemo } from "react";
import { Appearance } from "react-native";
import { create } from "zustand";
import { cache } from "./storage";
import {
  paletteFor,
  type Palette,
  type ThemeMode,
  type ThemeName,
} from "./theme";

export const THEME_KEY = "app.theme";
export const THEME_MODES: ThemeMode[] = ["light", "dark", "system"];

function systemName(): ThemeName {
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

function initialMode(): ThemeMode {
  const saved = cache.getString(THEME_KEY) as ThemeMode | undefined;
  return saved && THEME_MODES.includes(saved) ? saved : "system";
}

function resolve(mode: ThemeMode, system: ThemeName): ThemeName {
  return mode === "system" ? system : mode;
}

type ThemeState = {
  mode: ThemeMode;
  system: ThemeName;
  // Persists the preference; "system" hands control back to the OS.
  setMode: (mode: ThemeMode) => void;
  // Internal: fed by the Appearance listener.
  setSystem: (name: ThemeName) => void;
};

export const useThemeStore = create<ThemeState>()((set) => ({
  mode: initialMode(),
  system: systemName(),
  setMode: (mode) => {
    cache.set(THEME_KEY, mode);
    set({ mode });
  },
  setSystem: (name) => set({ system: name }),
}));

// Live OS colour-scheme updates (only meaningful while mode === "system", but
// keeping the value fresh costs nothing and avoids a stale first paint).
Appearance.addChangeListener(({ colorScheme }) => {
  useThemeStore
    .getState()
    .setSystem(colorScheme === "dark" ? "dark" : "light");
});

export type Theme = {
  palette: Palette;
  name: ThemeName;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

// The hook every screen uses: `const { palette } = useTheme()`.
export function useTheme(): Theme {
  const mode = useThemeStore((state) => state.mode);
  const system = useThemeStore((state) => state.system);
  const setMode = useThemeStore((state) => state.setMode);
  const name = resolve(mode, system);
  const palette = useMemo(() => paletteFor(name), [name]);
  return { palette, name, mode, setMode };
}

// Non-hook access for class components / module scope (error boundary, boot).
export function currentThemeName(): ThemeName {
  const { mode, system } = useThemeStore.getState();
  return resolve(mode, system);
}
export function currentPalette(): Palette {
  return paletteFor(currentThemeName());
}

// Cycles light -> dark -> system, used by the floating theme button on the map.
export function nextMode(mode: ThemeMode): ThemeMode {
  return mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
}
