/**
 * PlaceRow — one tappable row inside the destination sheet
 * (current location, set on map, recent, saved, favorite, search suggestion).
 * Large touch target, gold press feedback, RTL-safe, never clips text.
 */
import React from "react"
import { I18nManager, Pressable, StyleSheet, Text, View } from "react-native"
import {
	colors,
	iconSize,
	radius,
	spacing,
	touchTarget,
	typography,
} from "../../design/theme"

export type PlaceRowProps = {
	title: string
	subtitle?: string
	/** Gold leading glyph (from ../icons/Icons). */
	icon: React.ReactNode
	onPress: () => void
	trailing?: React.ReactNode
	testID?: string
}

const PlaceRow: React.FC<PlaceRowProps> = ({
	title,
	subtitle,
	icon,
	onPress,
	trailing,
	testID,
}) => (
	<Pressable
		onPress={onPress}
		testID={testID}
		accessibilityRole="button"
		accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
		android_ripple={{ color: colors.pressed }}
		style={({ pressed }) => [styles.row, pressed && styles.pressed]}
	>
		<View style={styles.iconWrap}>{icon}</View>
		<View style={styles.texts}>
			<Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
				{title}
			</Text>
			{!!subtitle && (
				<Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
					{subtitle}
				</Text>
			)}
		</View>
		{trailing ? <View style={styles.trailing}>{trailing}</View> : null}
	</Pressable>
)

const styles = StyleSheet.create({
	row: {
		minHeight: touchTarget + 8,
		flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
		alignItems: "center",
		gap: spacing.lg,
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.md,
		borderRadius: radius.md,
	},
	pressed: {
		backgroundColor: colors.pressed,
	},
	iconWrap: {
		width: iconSize.xl,
		height: iconSize.xl,
		alignItems: "center",
		justifyContent: "center",
	},
	texts: {
		flex: 1,
		flexShrink: 1,
	},
	title: {
		...typography.body,
		fontSize: 17,
		fontWeight: "600",
		color: colors.textPrimary,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
	},
	subtitle: {
		...typography.caption,
		color: colors.textSecondary,
		marginTop: 2,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
	},
	trailing: {
		marginStart: spacing.sm,
	},
})

export default React.memo(PlaceRow)
