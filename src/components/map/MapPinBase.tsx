/**
 * MapPinBase — shared foundation for PickupPin and DropoffPin.
 *
 * Pure UI. It knows nothing about maps, geocoding or road snapping:
 * the parent passes `state` ("dragging" | "snapped") and the base handles
 * every visual + animation detail.
 *
 * Visual anatomy (identical dimensions for both pins):
 *   ┌ speech bubble ─┐   (snapped only)
 *   ○ circular head    (black center, thin gold border, gold glyph)
 *   │ long stem
 *   ● soft gold glow at the tip (snapped only)
 *   · detached gold dot (dragging only)
 */
import React, { useEffect, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
	Easing,
	interpolate,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated"
import Svg, { Circle, Line } from "react-native-svg"
import { colors, motion } from "../../design/theme"
import PinSpeechBubble from "./PinSpeechBubble"

export type MapPinState = "dragging" | "snapped"

/** Shared geometry — both pins are pixel-identical apart from the glyph. */
export const PIN_GEOMETRY = {
	headSize: 46,
	headBorderWidth: 2,
	stemHeight: 30,
	stemWidth: 2.5,
	glowSize: 26,
	dotSize: 9,
	/** Gap between stem tip and the detached dot while dragging. */
	dotGap: 7,
	glyphSize: 22,
	bubbleGap: 10,
} as const

export const PIN_WIDTH = 200
export const PIN_HEIGHT =
	PIN_GEOMETRY.headSize +
	PIN_GEOMETRY.stemHeight +
	PIN_GEOMETRY.dotGap +
	PIN_GEOMETRY.dotSize

export type MapPinBaseProps = {
	/** "dragging" while the user moves the map, "snapped" once snapped to a road. */
	state: MapPinState
	/** Speech bubble label, shown only in the snapped state. */
	label: string
	/** Gold glyph rendered inside the circular head. */
	glyph: React.ReactNode
	/** Hide the bubble even when snapped (e.g. while the sheet is expanded). */
	hideBubble?: boolean
	testID?: string
}

const MapPinBase: React.FC<MapPinBaseProps> = ({
	state,
	label,
	glyph,
	hideBubble = false,
	testID,
}) => {
	const snapped = state === "snapped"

	/** 0 = dragging, 1 = snapped. Single driver for every transition. */
	const progress = useSharedValue(snapped ? 1 : 0)
	/** Lift while dragging so the pin "floats" above the map. */
	const lift = useSharedValue(snapped ? 0 : 1)
	const bubbleVisible = useSharedValue(snapped && !hideBubble ? 1 : 0)

	useEffect(() => {
		progress.value = withTiming(snapped ? 1 : 0, {
			duration: motion.base,
			easing: Easing.out(Easing.cubic),
		})
		lift.value = withSpring(snapped ? 0 : 1, motion.spring)
	}, [snapped, progress, lift])

	useEffect(() => {
		bubbleVisible.value = withTiming(snapped && !hideBubble ? 1 : 0, {
			duration: motion.base,
			easing: Easing.out(Easing.cubic),
		})
	}, [snapped, hideBubble, bubbleVisible])

	/** Head: subtle scale pop + float. */
	const headStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateY: interpolate(lift.value, [0, 1], [0, -6]) },
			{ scale: interpolate(progress.value, [0, 1], [0.94, 1]) },
		],
	}))

	/** Glow: fades + scales in only after snapping. */
	const glowStyle = useAnimatedStyle(() => ({
		opacity: progress.value,
		transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }],
	}))

	/** Detached dot: visible only while dragging. */
	const dotStyle = useAnimatedStyle(() => ({
		opacity: 1 - progress.value,
		transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.5]) }],
	}))

	const stemStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: interpolate(lift.value, [0, 1], [0, -6]) }],
	}))

	const bubbleProgress = useDerivedValue(() => bubbleVisible.value)

	const head = useMemo(
		() => (
			<View style={styles.headInner} pointerEvents="none">
				{glyph}
			</View>
		),
		[glyph],
	)

	return (
		<View style={styles.root} pointerEvents="none" testID={testID}>
			{/* Speech bubble (snapped only) */}
			<PinSpeechBubble label={label} progress={bubbleProgress} />

			{/* Circular head */}
			<Animated.View style={[styles.head, headStyle]}>
				<Svg
					width={PIN_GEOMETRY.headSize}
					height={PIN_GEOMETRY.headSize}
					viewBox={`0 0 ${PIN_GEOMETRY.headSize} ${PIN_GEOMETRY.headSize}`}
					style={StyleSheet.absoluteFill}
				>
					<Circle
						cx={PIN_GEOMETRY.headSize / 2}
						cy={PIN_GEOMETRY.headSize / 2}
						r={PIN_GEOMETRY.headSize / 2 - PIN_GEOMETRY.headBorderWidth / 2}
						fill={colors.black}
						stroke={colors.gold}
						strokeWidth={PIN_GEOMETRY.headBorderWidth}
					/>
				</Svg>
				{head}
			</Animated.View>

			{/* Long stem */}
			<Animated.View style={stemStyle}>
				<Svg width={PIN_GEOMETRY.stemWidth} height={PIN_GEOMETRY.stemHeight}>
					<Line
						x1={PIN_GEOMETRY.stemWidth / 2}
						y1={0}
						x2={PIN_GEOMETRY.stemWidth / 2}
						y2={PIN_GEOMETRY.stemHeight}
						stroke={colors.gold}
						strokeWidth={PIN_GEOMETRY.stemWidth}
						strokeLinecap="round"
					/>
				</Svg>
			</Animated.View>

			{/* Tip zone: glow (snapped) + detached dot (dragging) share the anchor */}
			<View style={styles.tip}>
				<Animated.View style={[styles.glowWrap, glowStyle]}>
					<Svg width={PIN_GEOMETRY.glowSize} height={PIN_GEOMETRY.glowSize}>
						<Circle
							cx={PIN_GEOMETRY.glowSize / 2}
							cy={PIN_GEOMETRY.glowSize / 2}
							r={PIN_GEOMETRY.glowSize / 2}
							fill={colors.glow}
						/>
						<Circle
							cx={PIN_GEOMETRY.glowSize / 2}
							cy={PIN_GEOMETRY.glowSize / 2}
							r={PIN_GEOMETRY.glowSize / 2 - 6}
							fill={colors.gold}
						/>
					</Svg>
				</Animated.View>

				<Animated.View style={[styles.dotWrap, dotStyle]}>
					<Svg width={PIN_GEOMETRY.dotSize} height={PIN_GEOMETRY.dotSize}>
						<Circle
							cx={PIN_GEOMETRY.dotSize / 2}
							cy={PIN_GEOMETRY.dotSize / 2}
							r={PIN_GEOMETRY.dotSize / 2}
							fill={colors.gold}
						/>
					</Svg>
				</Animated.View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		width: PIN_WIDTH,
		alignItems: "center",
		justifyContent: "flex-end",
	},
	head: {
		width: PIN_GEOMETRY.headSize,
		height: PIN_GEOMETRY.headSize,
		alignItems: "center",
		justifyContent: "center",
	},
	headInner: {
		alignItems: "center",
		justifyContent: "center",
	},
	tip: {
		height: PIN_GEOMETRY.dotGap + PIN_GEOMETRY.dotSize,
		alignItems: "center",
		justifyContent: "flex-start",
		width: PIN_GEOMETRY.glowSize,
	},
	glowWrap: {
		position: "absolute",
		top: -PIN_GEOMETRY.glowSize / 2,
		alignItems: "center",
		justifyContent: "center",
	},
	dotWrap: {
		position: "absolute",
		top: PIN_GEOMETRY.dotGap,
	},
})

export default React.memo(MapPinBase)
