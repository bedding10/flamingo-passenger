import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PressScale } from "./PressScale";
import { RADIUS, SHADOW, TYPE } from "../core/design";
import { useTheme } from "../core/theme-store";
import { withAlpha } from "../core/theme";

/**
 * The signature flaminGO action button: a large gold gradient pill with a soft
 * glow, press scaling and an inline loading state. Used for the single most
 * important action of a screen (request a ride, confirm, pay).
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
          <ActivityIndicator color={palette.onAccent} />
        ) : (
          <Text style={[styles.label, { color: palette.onAccent }]}>{label}</Text>
        )}
      </LinearGradient>
      <View
        pointerEvents="none"
        style={[styles.sheen, { backgroundColor: withAlpha(palette.onAccent, 0.16) }]}
      />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 62,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
  },
  blocked: { opacity: 0.45 },
  gradient: {
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  label: { ...TYPE.bodyStrong, fontSize: 17, fontWeight: "800" },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "38%",
  },
});

export const GoldButton = React.memo(GoldButtonBase);
