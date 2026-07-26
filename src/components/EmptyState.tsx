import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Illustration, type IllustrationName } from "./Illustration";
import { useTheme } from "../core/theme-store";
import { SPACING, TYPE } from "../core/design";

/**
 * Empty / hero state: a 3D illustration, a strong title and one calm line of
 * explanation. The artwork is decorative and lazy, so an empty list costs
 * almost nothing to render.
 */
function EmptyStateBase({
  art,
  title,
  subtitle,
  size = 168,
}: {
  art: IllustrationName;
  title: string;
  subtitle?: string;
  size?: number;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.wrap}>
      <Illustration name={art} size={size} />
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  title: { ...TYPE.heading, textAlign: "center" },
  subtitle: { ...TYPE.caption, textAlign: "center", maxWidth: 280 },
});

export const EmptyState = React.memo(EmptyStateBase);
