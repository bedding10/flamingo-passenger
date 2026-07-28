/**
 * MapPinBase — flaminGO map pin, rebuilt from scratch. 100% SVG, no PNG.
 *
 * Size is deliberately SMALL (Heetch-like), identity is Gold + Black.
 *
 * ── The choreography (the important part) ─────────────────────────────────
 * The ORIGIN is the dot painted on the map, not the pin.
 *
 *  state = "dragging"  (the user is moving the map)
 *      1. the bubble disappears FIRST
 *      2. only then the pin lifts up and visually detaches from the dot
 *      3. the dot never moves — it stays welded to the map point
 *
 *  state = "snapped"   (the user released the map)
 *      1. the pin stays lifted for a beat
 *      2. it descends with a spring until its tip touches the dot
 *      3. the dot fades out — the pin has "planted" itself on the point
 *      4. immediately after, the bubble appears (fade + scale)
 *
 * Pure UI: this component knows nothing about maps, geocoding or snapping.
 */
import React, { useEffect, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
	Easing,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated"
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg"
import { colors, motion } from "../../design/theme"
import PinSpeechBubble from "./PinSpeechBubble"

export type MapPinState = "dragging" | "snapped"

/**
 * Shared geometry. Small on purpose: a 34pt head reads exactly like Heetch's
 * marker at normal zoom, while the old 46pt head looked like a balloon.
 */
export const PIN_GEOMETRY = {
	headSize: 34,
	headBorderWidth: 2,
	stemHeight: 16,
	stemWidth: 2,
	/** Origin dot painted on the map point. */
	dotSize: 10,
	dotRingSize: 20,
	glyphSize: 16,
	/** How high the pin flies while the map is being dragged. */
	liftDistance: 18,
	bubbleGap: 6,
} as const

export const PIN_WIDTH = 180
export const PIN_HEIGHT =
	PIN_GEOMETRY.headSize + PIN_GEOMETRY.stemHeight + PIN_GEOMETRY.dotRingSize

/** Timing of the landing sequence, in ms. */
const LAND = {
	/** The pin hangs in the air before starting to descend. */
	hold: 90,
	/** The dot only fades once the tip has actually reached it. */
	dotFadeDelay: 260,
	dotFade: 150,
	/** The bubble appears right after the dot is gone. */
	bubbleDelay: 380,
} as const

export type MapPinBaseProps = {
	/** "dragging" while the user moves the map, "snapped" once released. */
	state: MapPinState
	/** Speech bubble label, shown only after the landing animation. */
	label: string
	/** Gold or black glyph rendered inside the head. */
	glyph: React.ReactNode
	/** Solid gold head (pickup) vs. black head with a gold ring (dropoff). */
	solid?: boolean
	/** Hide the bubble even when snapped (e.g. while the sheet is expanded). */
	hideBubble?: boolean
	testID?: string
}

const MapPinBase: React.FC<MapPinBaseProps> = ({
	state,
	label,
	glyph,
	solid = true,
	hideBubble = false,
	testID,
}) => {
	const snapped = state === "snapped"

	/** 0 = planted on the dot, 1 = fully lifted. */
	const lift = useSharedValue(snapped ? 0 : 1)
	/** 0 = dot hidden, 1 = dot visible. Visible only while detached. */
	const dot = useSharedValue(snapped ? 0 : 1)
	/** 0 = bubble hidden, 1 = bubble visible. */
	const bubble = useSharedValue(snapped && !hideBubble ? 1 : 0)

	useEffect(() => {
		if (!snapped) {
			// 1. bubble out first — 2. then the pin takes off — dot stays put.
			bubble.value = withTiming(0, {
				duration: motion.fast,
				easing: Easing.in(Easing.quad),
			})
			dot.value = withTiming(1, { duration: motion.fast })
			lift.value = withDelay(60, withSpring(1, motion.pinLift))
			return
		}
		// 1. hold in the air — 2. descend with a spring onto the dot.
		lift.value = withSequence(
			withTiming(1, { duration: LAND.hold }),
			withSpring(0, motion.pinLand),
		)
		// 3. the dot only disappears once the tip has touched it.
		dot.value = withDelay(
			LAND.dotFadeDelay,
			withTiming(0, { duration: LAND.dotFade, easing: Easing.out(Easing.quad) }),
		)
	}, [snapped, lift, dot, bubble])

	// 4. the bubble comes back only after the pin has planted itself.
	useEffect(() => {
		const show = snapped && !hideBubble
		bubble.value = show
			? withDelay(
					LAND.bubbleDelay,
					withSpring(1, motion.springSoft),
				)
			: withTiming(0, { duration: motion.fast })
	}, [snapped, hideBubble, bubble])

	/** Head + stem move together: they are the object that flies. */
	const bodyStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateY: -lift.value * PIN_GEOMETRY.liftDistance },
			// A whisper of scale sells the "lifting toward the camera" feel.
			{ scale: interpolate(lift.value, [0, 1], [1, 1.06]) },
		],
	}))

	/** Contact shadow under the pin: tightens as the pin lands. */
	const shadowStyle = useAnimatedStyle(() => ({
		opacity: interpolate(lift.value, [0, 1], [0.28, 0.12]),
		transform: [{ scale: interpolate(lift.value, [0, 1], [0.8, 1.25]) }],
	}))

	/** The origin dot: never translates, only fades. */
	const dotStyle = useAnimatedStyle(() => ({
		opacity: dot.value,
		transform: [{ scale: interpolate(dot.value, [0, 1], [0.6, 1]) }],
	}))

	const headFill = solid ? colors.gold : colors.black
	const headStroke = solid ? colors.black : colors.gold

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
			<PinSpeechBubble label={label} progress={bubble} />

			{/* Head + stem — the flying body */}
			<Animated.View style={bodyStyle}>
				<View style={styles.head}>
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
							fill={headFill}
							stroke={headStroke}
							strokeWidth={PIN_GEOMETRY.headBorderWidth}
						/>
					</Svg>
					{head}
				</View>

				{/* Short tapered stem, gold in both variants */}
				<Svg
					width={PIN_GEOMETRY.stemWidth + 2}
					height={PIN_GEOMETRY.stemHeight}
					style={styles.stem}
				>
					<Rect
						x={1}
						y={0}
						width={PIN_GEOMETRY.stemWidth}
						height={PIN_GEOMETRY.stemHeight}
						rx={PIN_GEOMETRY.stemWidth / 2}
						fill={solid ? colors.gold : colors.gold}
					/>
				</Svg>
			</Animated.View>

			{/* Ground zone: contact shadow + the origin dot (never moves) */}
			<View style={styles.ground}>
				<Animated.View style={[styles.shadowWrap, shadowStyle]}>
					<Svg
						width={PIN_GEOMETRY.dotRingSize}
						height={PIN_GEOMETRY.dotRingSize / 2}
					>
						<Defs>
							<RadialGradient id="pinShadow" cx="50%" cy="50%" r="50%">
								<Stop offset="0" stopColor={colors.black} stopOpacity={0.8} />
								<Stop offset="1" stopColor={colors.black} stopOpacity={0} />
							</RadialGradient>
						</Defs>
						<Circle
							cx={PIN_GEOMETRY.dotRingSize / 2}
							cy={PIN_GEOMETRY.dotRingSize / 4}
							r={PIN_GEOMETRY.dotRingSize / 2}
							fill="url(#pinShadow)"
						/>
					</Svg>
				</Animated.View>

				<Animated.View style={[styles.dotWrap, dotStyle]}>
					<Svg
						width={PIN_GEOMETRY.dotRingSize}
						height={PIN_GEOMETRY.dotRingSize}
					>
						<Circle
							cx={PIN_GEOMETRY.dotRingSize / 2}
							cy={PIN_GEOMETRY.dotRingSize / 2}
							r={PIN_GEOMETRY.dotRingSize / 2}
							fill={colors.originRing}
						/>
						<Circle
							cx={PIN_GEOMETRY.dotRingSize / 2}
							cy={PIN_GEOMETRY.dotRingSize / 2}
							r={PIN_GEOMETRY.dotSize / 2}
							fill={colors.origin}
							stroke={colors.white}
							strokeWidth={2}
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
	stem: {
		alignSelf: "center",
		marginTop: -1,
	},
	ground: {
		width: PIN_GEOMETRY.dotRingSize,
		height: PIN_GEOMETRY.dotRingSize,
		alignItems: "center",
		justifyContent: "center",
		marginTop: -PIN_GEOMETRY.dotRingSize / 2,
	},
	shadowWrap: {
		position: "absolute",
		top: PIN_GEOMETRY.dotRingSize / 2 - 2,
	},
	dotWrap: {
		position: "absolute",
	},
})

export default React.memo(MapPinBase)
