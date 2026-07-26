/**
 * RouteRows — the Heetch-style pickup / destination pair with a vertical
 * connector between the two dots. Used at the top of the expanded sheet.
 */
import React from "react"
import { I18nManager, Pressable, StyleSheet, Text, View } from "react-native"
import {
	colors,
	radius,
	spacing,
	touchTarget,
	typography,
} from "../../design/theme"

export type RouteRowsProps = {
	pickupLabel: string
	pickupPlaceholder: string
	destinationLabel: string
	destinationPlaceholder: string
	onPressPickup: () => void
	onPressDestination: () => void
	/** Which row is currently being edited — gets the gold focus treatment. */
	active?: "pickup" | "destination"
}

const DOT = 11
const RAIL_WIDTH = 22

const RouteRows: React.FC<RouteRowsProps> = ({
	pickupLabel,
	pickupPlaceholder,
	destinationLabel,
	destinationPlaceholder,
	onPressPickup,
	onPressDestination,
	active,
}) => (
	<View style={styles.root}>
		{/* Rail: pickup dot → connector → destination square */}
		<View style={styles.rail} pointerEvents="none">
			<View style={styles.dotOuter}>
				<View style={styles.dotInner} />
			</View>
			<View style={styles.connector} />
			<View style={styles.square} />
		</View>

		<View style={styles.rows}>
			<Pressable
				onPress={onPressPickup}
				android_ripple={{ color: colors.pressed }}
				style={({ pressed }) => [
					styles.row,
					active === "pickup" && styles.rowActive,
					pressed && styles.pressed,
				]}
				accessibilityRole="button"
			>
				<Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
					{pickupLabel || pickupPlaceholder}
				</Text>
			</Pressable>

			<View style={styles.rowDivider} />

			<Pressable
				onPress={onPressDestination}
				android_ripple={{ color: colors.pressed }}
				style={({ pressed }) => [
					styles.row,
					active === "destination" && styles.rowActive,
					pressed && styles.pressed,
				]}
				accessibilityRole="button"
			>
				<Text
					style={[styles.value, !destinationLabel && styles.placeholder]}
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
		paddingHorizontal: spacing.xl,
		gap: spacing.md,
	},
	rail: {
		width: RAIL_WIDTH,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: spacing.xl,
	},
	dotOuter: {
		width: DOT + 6,
		height: DOT + 6,
		borderRadius: radius.pill,
		borderWidth: 2,
		borderColor: colors.gold,
		alignItems: "center",
		justifyContent: "center",
	},
	dotInner: {
		width: DOT - 4,
		height: DOT - 4,
		borderRadius: radius.pill,
		backgroundColor: colors.gold,
	},
	connector: {
		flex: 1,
		minHeight: 22,
		width: 2,
		backgroundColor: colors.divider,
		marginVertical: spacing.xs,
	},
	square: {
		width: DOT,
		height: DOT,
		borderRadius: 3,
		backgroundColor: colors.black,
	},
	rows: {
		flex: 1,
	},
	row: {
		minHeight: touchTarget,
		justifyContent: "center",
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
	},
	rowActive: {
		backgroundColor: colors.pressed,
	},
	pressed: {
		backgroundColor: colors.pressed,
	},
	rowDivider: {
		height: 1,
		backgroundColor: colors.divider,
		marginHorizontal: spacing.md,
	},
	value: {
		...typography.body,
		fontSize: 17,
		fontWeight: "600",
		color: colors.textPrimary,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
	},
	placeholder: {
		color: colors.textSecondary,
		fontWeight: "500",
	},
})

export default React.memo(RouteRows)
