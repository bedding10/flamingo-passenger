/**
 * MapFloatingButton — the small square control that floats over the map
 * (menu on one side, theme toggle on the other).
 *
 * Heetch geometry: SMALL corner radius, tight shadow, 44pt square. It fades and
 * scales out as soon as the bottom sheet is expanded, and comes back when the
 * sheet returns to its collapsed state — driven by the `hidden` prop, always on
 * the UI thread (Reanimated, never LayoutAnimation).
 */
import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  colors,
  motion,
  radius,
  shadows,
  surfacesFor,
} from "../../design/theme";

export type MapFloatingButtonProps = {
  /** Theme the MAP is drawn with — the button inverts it, like the sheet. */
  mapTheme: "light" | "dark";
  /** True while the bottom sheet is expanded. */
  hidden?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  side: "start" | "end";
  /** Distance from the top of the safe area. */
  top?: number;
  /** Distance from the bottom (used by the gold "my location" button). */
  bottom?: number;
  /** "surface" follows the theme, "gold" is the NovaRide accent button. */
  variant?: "surface" | "gold";
  children: React.ReactNode;
};

const SIZE = 48;

const MapFloatingButton: React.FC<MapFloatingButtonProps> = ({
  mapTheme,
  hidden = false,
  onPress,
  accessibilityLabel,
  side,
  top,
  bottom,
  variant = "surface",
  children,
}) => {
  // The control follows the APP theme (white by day, black by night); it is
  // deliberately NOT inverted like the sheet used to be.
  const surfaces = surfacesFor(mapTheme === "dark" ? "light" : "dark");
  const shown = useSharedValue(hidden ? 0 : 1);

  useEffect(() => {
    shown.value = withTiming(hidden ? 0 : 1, {
      duration: motion.base,
      easing: Easing.out(Easing.cubic),
    });
  }, [hidden, shown]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [
      { scale: interpolate(shown.value, [0, 1], [0.85, 1]) },
      { translateY: interpolate(shown.value, [0, 1], [-8, 0]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "auto"}
      style={[
        styles.root,
        side === "start" ? styles.start : styles.end,
        top != null ? { top } : null,
        bottom != null ? { bottom } : null,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: variant === "gold" ? colors.gold : surfaces.sheet,
          },
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    ...shadows.floating,
  },
  start: { insetInlineStart: 20 },
  end: { insetInlineEnd: 20 },
  button: {
    width: SIZE,
    height: SIZE,
    /* Circular, as requested for both the menu and the location button. */
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
});

export default React.memo(MapFloatingButton);
