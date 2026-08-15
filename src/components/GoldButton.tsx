import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PressScale } from "./PressScale";
import { SHADOW } from "../core/design";
import { colors, radius, typography } from "../design/theme";
import { useTheme } from "../core/theme-store";
import { withAlpha } from "../core/theme";
import { useLatinType } from "../core/typeface";

/**
 * The signature flaminGO action button: a FULL PILL in brand gold with black
 * label, a soft glow, press scaling and an inline loading state. Used for the
 * single most important action of a screen (find a driver, confirm, pay).
 *
 * The pill radius is non-negotiable: every primary CTA in the app is
 * `radius.pill`.
 */
function GoldButtonBase({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { palette } = useTheme();
  const type = useLatinType();
  const blocked = disabled || loading;
  return (
    <PressScale
      accessibilityLabel={label}
      disabled={blocked}
      onPress={onPress}
      style={[
        styles.wrap,
        SHADOW.floating,
        { shadowColor: palette.accent },
        blocked && styles.blocked,
      ]}
    >
      <LinearGradient
        colors={[
          withAlpha(palette.accent, 1),
          withAlpha(palette.routeGlow, 0.95),
          withAlpha(palette.accent, 1),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Text style={[type("title"), styles.label]}>{label}</Text>
        )}
      </LinearGradient>
      <View
        pointerEvents="none"
        style={[styles.sheen, { backgroundColor: withAlpha(colors.white, 0.16) }]}
      />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 62,
    /* Always a full pill. Never a rounded rectangle. */
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  blocked: { opacity: 0.45 },
  gradient: {
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  /* Black label on gold: the highest-contrast pairing the palette allows. */
  label: { ...typography.title, fontWeight: "800", color: colors.ink },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "38%",
  },
});

export const GoldButton = React.memo(GoldButtonBase);
