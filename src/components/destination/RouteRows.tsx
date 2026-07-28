/**
 * RouteRows — the Heetch pickup / destination pair.
 *
 *   ●  Current location
 *   │
 *   │
 *   ■  Destination
 *
 * A single rail with a gold dot on top, a vertical connector, and a charcoal
 * square at the bottom. Both rows live INSIDE the bottom sheet — tapping one
 * never opens a new screen, it just tells the sheet which point is being
 * edited.
 */
import React from "react"
import { I18nManager, Pressable, StyleSheet, Text, View } from "react-native"
import {
	colors,
	radius,
	spacing,
	typography,
	type Surfaces,
} from "../../design/theme"

export type RouteTarget = "pickup" | "destination"

export type RouteRowsProps = {
	surfaces: Surfaces
	pickupLabel: string
	pickupPlaceholder: string
	destinationLabel: string
	destinationPlaceholder: string
	onPressPickup: () => void
	onPressDestination: () => void
	/** Which row is currently being edited — gets the gold focus treatment. */
	active?: RouteTarget
}

const DOT = 10
const ROW_HEIGHT = 46
const RAIL_WIDTH = 18

const RouteRows: React.FC<RouteRowsProps> = ({
	surfaces,
	pickupLabel,
	pickupPlaceholder,
	destinationLabel,
	destinationPlaceholder,
	onPressPickup,
	onPressDestination,
	active,
}) => (
	<View
		style={[
			styles.root,
			{ backgroundColor: surfaces.field, borderColor: surfaces.divider },
		]}
	>
		{/* Rail: gold dot → vertical connector → charcoal square */}
		<View style={styles.rail} pointerEvents="none">
			<View style={styles.dot} />
			<View
				style={[styles.connector, { backgroundColor: surfaces.divider }]}
			/>
			<View style={[styles.square, { borderColor: colors.gold }]} />
		</View>

		<View style={styles.rows}>
			<Pressable
				onPress={onPressPickup}
				android_ripple={{ color: colors.pressed }}
				style={({ pressed }) => [
					styles.row,
					(pressed || active === "pickup") && styles.rowActive,
				]}
				accessibilityRole="button"
			>
				<Text
					style={[
						styles.value,
						{ color: pickupLabel ? surfaces.text : surfaces.textMuted },
					]}
					numberOfLines={1}
					ellipsizeMode="tail"
				>
					{pickupLabel || pickupPlaceholder}
				</Text>
			</Pressable>

			<View style={[styles.rowDivider, { backgroundColor: surfaces.divider }]} />

			<Pressable
				onPress={onPressDestination}
				android_ripple={{ color: colors.pressed }}
				style={({ pressed }) => [
					styles.row,
					(pressed || active === "destination") && styles.rowActive,
				]}
				accessibilityRole="button"
			>
				<Text
					style={[
						styles.value,
						{ color: destinationLabel ? surfaces.text : surfaces.textMuted },
					]}
					numberOfLines={1}
					ellipsizeMode="tail"
				>
					{destinationLabel || destinationPlaceholder}
				</Text>
			</Pressable>
		</View>
	</View>
)

const styles = StyleSheet.create({
	root: {
		flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
		alignItems: "stretch",
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: spacing.md,
		gap: spacing.md,
	},
	rail: {
		width: RAIL_WIDTH,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: (ROW_HEIGHT - DOT) / 2,
	},
	dot: {
		width: DOT,
		height: DOT,
		borderRadius: radius.pill,
		backgroundColor: colors.gold,
	},
	connector: {
		flex: 1,
		minHeight: 16,
		width: 1.5,
		marginVertical: spacing.xs,
	},
	square: {
		width: DOT,
		height: DOT,
		borderRadius: 2,
		borderWidth: 2.5,
	},
	rows: {
		flex: 1,
	},
	row: {
		height: ROW_HEIGHT,
		justifyContent: "center",
		borderRadius: radius.sm,
		paddingHorizontal: spacing.xs,
	},
	rowActive: {
		backgroundColor: colors.pressed,
	},
	rowDivider: {
		height: StyleSheet.hairlineWidth,
	},
	value: {
		...typography.subtitle,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
	},
})

export default React.memo(RouteRows)
