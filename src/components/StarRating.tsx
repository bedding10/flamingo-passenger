/**
 * StarRating — five stars that honour fractional values.
 *
 * A rating of 3.5 draws three full stars, one half-filled star and one empty
 * one. Each star is a single SVG path drawn twice: once in the divider colour
 * (the empty shell) and once in gold, clipped horizontally to the fraction that
 * should be filled.
 */
import React, { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { ClipPath, Defs, Path, Rect } from "react-native-svg";
import { colors } from "../design/theme";

const VIEWBOX = 24;

const STAR_PATH =
  "m12 3.4 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.8l6-.9L12 3.4Z";

type StarProps = {
  /** 0 = empty, 1 = full. Anything in between is a partial fill. */
  fill: number;
  size: number;
};

const Star: React.FC<StarProps> = ({ fill, size }) => {
  // Every instance needs its OWN clip id: on Android all SVGs share one id
  // namespace, so a hard-coded "fillClip" would make every star inherit the
  // clip of whichever star rendered last.
  const clipId = `star-clip-${useId()}`;
  const ratio = Math.max(0, Math.min(1, fill));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      <Path d={STAR_PATH} fill={colors.divider} />
      {ratio > 0 ? (
        <>
          <Defs>
            <ClipPath id={clipId}>
              <Rect x={0} y={0} width={VIEWBOX * ratio} height={VIEWBOX} />
            </ClipPath>
          </Defs>
          <Path d={STAR_PATH} fill={colors.gold} clipPath={`url(#${clipId})`} />
        </>
      ) : null}
    </Svg>
  );
};

export type StarRatingProps = {
  /** Average rating, 0 to 5, fractions welcome. */
  rating: number;
  size?: number;
};

const StarRating: React.FC<StarRatingProps> = ({ rating, size = 14 }) => (
  <View style={styles.row} accessibilityRole="image">
    {Array.from({ length: 5 }, (_, index) => (
      <Star key={index} fill={rating - index} size={size} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  // Fixed structure, exactly like every other row in the app: it does not
  // follow the language.
  row: { flexDirection: "row-reverse", gap: 2 },
});

export default React.memo(StarRating);
