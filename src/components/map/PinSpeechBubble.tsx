/**
 * PinSpeechBubble — the "Pickup here" / "Dropoff here" bubble above a map pin.
 * Driven by a shared value so it fades + scales + springs in 200ms.
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
	/** 0 = hidden, 1 = fully visible. */
	progress: SharedValue<number>
}

const TAIL_WIDTH = 14
const TAIL_HEIGHT = 7

const PinSpeechBubble: React.FC<PinSpeechBubbleProps> = ({
	label,
	progress,
}) => {
	const style = useAnimatedStyle(() => ({
		opacity: progress.value,
		transform: [
			{ translateY: interpolate(progress.value, [0, 1], [8, 0]) },
			{ scale: interpolate(progress.value, [0, 1], [0.9, 1]) },
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
					fill={colors.white}
				/>
			</Svg>
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	root: {
		alignItems: "center",
		marginBottom: spacing.sm,
	},
	bubble: {
		backgroundColor: colors.white,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md - 2,
		borderRadius: radius.md,
		maxWidth: 190,
		...shadows.floating,
	},
	label: {
		...typography.caption,
		fontSize: 14,
		fontWeight: "700",
		color: colors.textPrimary,
		textAlign: "center",
	},
	tail: {
		marginTop: -1,
	},
})

export default React.memo(PinSpeechBubble)
