/**
 * SearchField — large premium search input used by the destination sheet.
 * White background, gold search icon, soft shadow, large rounded corners.
 * RTL-safe: relies on writingDirection + row-reverse handled by RN's I18nManager.
 */
import React, { forwardRef } from "react"
import {
	I18nManager,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
	type TextInputProps,
} from "react-native"
import {
	colors,
	iconSize,
	radius,
	shadows,
	spacing,
	touchTarget,
	typography,
} from "../../design/theme"
import { SearchIcon } from "../icons/Icons"

export type SearchFieldProps = Omit<TextInputProps, "style"> & {
	/** When provided the field renders as a button (collapsed state). */
	onPress?: () => void
	/** Read-only presentation for the collapsed state. */
	readOnly?: boolean
	placeholder?: string
}

const SearchField = forwardRef<TextInput, SearchFieldProps>(
	({ onPress, readOnly = false, placeholder, value, ...inputProps }, ref) => {
		const content = (
			<View style={styles.field}>
				<SearchIcon size={iconSize.md} color={colors.gold} />
				{readOnly ? (
					<Text
						style={[
							styles.input,
							styles.readOnlyText,
							!value && styles.placeholder,
						]}
						numberOfLines={1}
					>
						{value || placeholder}
					</Text>
				) : (
					<TextInput
						ref={ref}
						style={styles.input}
						placeholder={placeholder}
						placeholderTextColor={colors.textSecondary}
						value={value}
						returnKeyType="search"
						autoCorrect={false}
						{...inputProps}
					/>
				)}
			</View>
		)

		if (!onPress) return content

		return (
			<Pressable
				onPress={onPress}
				android_ripple={{ color: colors.pressed }}
				style={({ pressed }) => [pressed && styles.pressed]}
				accessibilityRole="search"
			>
				{content}
			</Pressable>
		)
	},
)

SearchField.displayName = "SearchField"

const styles = StyleSheet.create({
	field: {
		minHeight: touchTarget,
		backgroundColor: colors.white,
		borderRadius: radius.lg,
		paddingHorizontal: spacing.lg,
		flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
		alignItems: "center",
		gap: spacing.md,
		...shadows.soft,
	},
	input: {
		flex: 1,
		...typography.body,
		fontSize: 17,
		color: colors.textPrimary,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
		paddingVertical: spacing.md,
	},
	readOnlyText: {
		paddingVertical: 0,
	},
	placeholder: {
		color: colors.textSecondary,
	},
	pressed: {
		backgroundColor: colors.pressed,
		borderRadius: radius.lg,
	},
})

export default SearchField
