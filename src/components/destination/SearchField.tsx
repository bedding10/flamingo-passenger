/**
 * SearchField — the Heetch-style search input of the destination sheet.
 *
 * NOT a capsule: small corner radius, comfortable height, light shadow.
 * Colours come from the inverted `Surfaces` set, so the field is charcoal on a
 * light map and off-white on a dark map.
 */
import React, { forwardRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import {
  colors,
  iconSize,
  radius,
  shadows,
  spacing,
  typography,
  type Surfaces,
} from "../../design/theme";
import { useTextDirection } from "../../core/text-direction";
import { SearchIcon } from "../icons/Icons";

export type SearchFieldProps = Omit<TextInputProps, "style"> & {
  surfaces: Surfaces;
  /** When provided the field renders as a button (collapsed state). */
  onPress?: () => void;
  /** Read-only presentation for the collapsed state. */
  readOnly?: boolean;
  placeholder?: string;
  /** Optional trailing node (clear button, spinner...). */
  trailing?: React.ReactNode;
  /**
   * "underline" (default) is the Heetch look: icon + text + a single bottom
   * hairline. No box, no border, no outline, no fill. "filled" keeps the old
   * boxed field for the search stage.
   */
  variant?: "underline" | "filled";
  /** Icon tint. Gold by default (NovaRide identity). */
  iconColor?: string;
};

const FIELD_HEIGHT = 52;

const SearchField = forwardRef<TextInput, SearchFieldProps>(
  (
    {
      surfaces,
      onPress,
      readOnly = false,
      placeholder,
      value,
      trailing,
      variant = "underline",
      iconColor = colors.gold,
      ...inputProps
    },
    ref,
  ) => {
    // Words follow the language; the icon/field row does not (see addendum 4).
    const { textAlign, writingDirection } = useTextDirection();
    const underline = variant === "underline";
    const content = (
      <View
        style={[
          styles.field,
          underline ? styles.underline : styles.filled,
          underline
            ? { borderBottomColor: surfaces.divider }
            : {
                backgroundColor: surfaces.field,
                borderColor: surfaces.divider,
              },
        ]}
      >
        <SearchIcon size={iconSize.md} color={iconColor} />
        {readOnly ? (
          <Text
            style={[
              styles.input,
              styles.readOnlyText,
              {
                color: value ? surfaces.text : surfaces.textMuted,
                textAlign,
                writingDirection,
              },
            ]}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
        ) : (
          <TextInput
            ref={ref}
            style={[
              styles.input,
              { color: surfaces.text, textAlign, writingDirection },
            ]}
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
    );

    if (!onPress) return content;

    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: colors.pressed }}
        style={({ pressed }) => [pressed && styles.pressed]}
        accessibilityRole="search"
      >
        {content}
      </Pressable>
    );
  },
);

SearchField.displayName = "SearchField";

const styles = StyleSheet.create({
  field: {
    height: FIELD_HEIGHT,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
  },
  /** Heetch search: icon + text + one bottom line. Nothing else. */
  underline: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filled: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    ...shadows.soft,
  },
  input: {
    flex: 1,
    ...typography.subtitle,
    paddingVertical: 0,
  },
  readOnlyText: {
    paddingVertical: 0,
  },
  pressed: {
    opacity: 0.75,
  },
});

export default SearchField;
