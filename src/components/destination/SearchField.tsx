/**
 * SearchField — the Heetch-style search input of the destination sheet.
 *
 * NOT a capsule: small corner radius, comfortable height, light shadow.
 * Colours come from the inverted `Surfaces` set, so the field is charcoal on a
 * light map and off-white on a dark map.
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
	typography,
	type Surfaces,
} from "../../design/theme"
import { SearchIcon } from "../icons/Icons"

export type SearchFieldProps = Omit<TextInputProps, "style"> & {
	surfaces: Surfaces
	/** When provided the field renders as a button (collapsed state). */
	onPress?: () => void
	/** Read-only presentation for the collapsed state. */
	readOnly?: boolean
	placeholder?: string
	/** Optional trailing node (clear button, spinner...). */
	trailing?: React.ReactNode
}

const FIELD_HEIGHT = 52

const SearchField = forwardRef<TextInput, SearchFieldProps>(
	(
		{
			surfaces,
			onPress,
			readOnly = false,
			placeholder,
			value,
			trailing,
			...inputProps
		},
		ref,
	) => {
		const content = (
			<View
				style={[
					styles.field,
					{ backgroundColor: surfaces.field, borderColor: surfaces.divider },
				]}
			>
				<SearchIcon size={iconSize.md} color={colors.gold} />
				{readOnly ? (
					<Text
						style={[
							styles.input,
							styles.readOnlyText,
							{ color: value ? surfaces.text : surfaces.textMuted },
						]}
						numberOfLines={1}
					>
						{value || placeholder}
					</Text>
				) : (
					<TextInput
						ref={ref}
						style={[styles.input, { color: surfaces.text }]}
						placeholder={placeholder}
						placeholderTextColor={surfaces.textMuted}
						value={value}
						returnKeyType="search"
						autoCorrect={false}
						{...inputProps}
					/>
				)}
				{trailing}
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
		height: FIELD_HEIGHT,
		borderRadius: radius.md,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: spacing.md,
		flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
		alignItems: "center",
		gap: spacing.sm,
		...shadows.soft,
	},
	input: {
		flex: 1,
		...typography.subtitle,
		paddingVertical: 0,
		textAlign: I18nManager.isRTL ? "right" : "left",
		writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
	},
	readOnlyText: {
		paddingVertical: 0,
	},
	pressed: {
		opacity: 0.75,
	},
})

export default SearchField
