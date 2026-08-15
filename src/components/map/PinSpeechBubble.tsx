/**
 * PinSpeechBubble — the small label that plants itself above a map pin.
 *
 * It is driven by a shared value owned by MapPinBase so the timing is part of
 * the pin choreography: it fades OUT first when the map starts moving, and it
 * only fades + scales IN once the pin has landed on the origin dot.
 *
 * flaminGO identity: charcoal capsule-free block, small radius, gold text.
 */
import React from "react"
import { StyleSheet, Text, View } from "react-native"
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated"
import Svg, { Path } from "react-native-svg"
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "../../design/theme"

export type PinSpeechBubbleProps = {
  label: string
  /** 0 = hidden, 1 = fully visible. Owned by MapPinBase. */
  progress: SharedValue<number>
}

const TAIL_WIDTH = 10
const TAIL_HEIGHT = 5

const PinSpeechBubble: React.FC<PinSpeechBubbleProps> = ({
  label,
  progress,
}) => {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [6, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.88, 1]) },
    ],
  }))

  return (
    <Animated.View style={[styles.root, style]} pointerEvents="none">
      <View style={styles.bubble}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Svg width={TAIL_WIDTH} height={TAIL_HEIGHT} style={styles.tail}>
        <Path
          d={`M0 0 H${TAIL_WIDTH} L${TAIL_WIDTH / 2} ${TAIL_HEIGHT} Z`}
          fill={colors.black}
        />
      </Svg>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  bubble: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    maxWidth: 170,
    ...shadows.floating,
  },
  label: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: "700",
    color: colors.gold,
    textAlign: "center",
  },
  tail: {
    marginTop: -1,
  },
})

export default React.memo(PinSpeechBubble)
