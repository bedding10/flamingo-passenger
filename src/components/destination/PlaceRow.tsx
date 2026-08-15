/**
 * PlaceRow — one tappable row inside the destination sheet
 * (current location, set on map, favorites, recent, search suggestion).
 *
 * Dense Heetch-like row: 20pt gold glyph, title + optional subtitle, hairline
 * separator handled by the list. Colours come from the inverted surfaces so it
 * reads correctly on both the charcoal and the white sheet.
 */
import React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import {
  colors,
  iconSize,
  radius,
  spacing,
  touchTarget,
  typography,
  type Surfaces,
} from "../../design/theme"
import { useTextDirection } from "../../core/text-direction"

export type PlaceRowProps = {
  surfaces: Surfaces
  title: string
  subtitle?: string
  /** Gold leading glyph (from ../icons/Icons). */
  icon: React.ReactNode
  onPress: () => void
  trailing?: React.ReactNode
  testID?: string
}

const PlaceRow: React.FC<PlaceRowProps> = ({
  surfaces,
  title,
  subtitle,
  icon,
  onPress,
  trailing,
  testID,
}) => {
  // Only the words re-align with the language; the row itself is fixed.
  const { textAlign, writingDirection } = useTextDirection()

  return (
    <Pressable
    onPress={onPress}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    android_ripple={{ color: colors.pressed }}
    style={({ pressed }) => [
      styles.row,
      pressed && { backgroundColor: surfaces.fieldPressed },
    ]}
  >
    <View style={styles.iconWrap}>{icon}</View>
    <View style={styles.texts}>
      <Text
        style={[
          styles.title,
          { color: surfaces.text, textAlign, writingDirection },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text
          style={[
            styles.subtitle,
            { color: surfaces.textMuted, textAlign, writingDirection },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {subtitle}
        </Text>
      )}
    </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  iconWrap: {
    width: iconSize.lg,
    height: iconSize.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: {
    flex: 1,
    flexShrink: 1,
  },
  title: {
    ...typography.body,
    fontSize: 15.5,
    fontWeight: "600",
  },
  subtitle: {
    ...typography.caption,
    marginTop: 1,
  },
  trailing: {
    marginStart: spacing.sm,
  },
})

export default React.memo(PlaceRow)
