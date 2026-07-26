import React, { useCallback, useMemo, type ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { DURATION, PRESS_SCALE } from "../core/design";
import { tapFeedback } from "../core/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable that scales down slightly while held. The animation runs entirely
 * on the Reanimated UI thread, so it never drops frames on low-end phones.
 */
function PressScaleBase({
  children,
  onPress,
  disabled,
  style,
  accessibilityLabel,
  accessibilityRole = "button",
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link";
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = useCallback(() => {
    scale.value = withTiming(PRESS_SCALE, { duration: DURATION.instant });
    tapFeedback();
  }, [scale]);
  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: DURATION.fast });
  }, [scale]);
  const composed = useMemo(() => [style, animated], [style, animated]);
  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={composed}
    >
      {children}
    </AnimatedPressable>
  );
}

export const PressScale = React.memo(PressScaleBase);
