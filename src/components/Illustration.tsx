import React, { useEffect, useState } from "react";
import { Image, View, type ImageSourcePropType } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { DURATION } from "../core/design";

/**
 * 3D artwork shown at the top of a screen or inside an empty state.
 *
 * The pictures are decorative only:
 * - they are required lazily on first paint, so a screen that never shows one
 *   never pays for decoding it;
 * - they never re-render (memoised, static source, no touch handling);
 * - they are hidden from screen readers.
 */
export type IllustrationName =
  | "profile"
  | "promotions"
  | "trips"
  | "help"
  | "wallet"
  | "notifications"
  | "empty";

const LOADERS: Record<IllustrationName, () => ImageSourcePropType> = {
  profile: () => require("../../assets/illus-profile.png"),
  promotions: () => require("../../assets/illus-promotions.png"),
  trips: () => require("../../assets/illus-trips.png"),
  help: () => require("../../assets/illus-help.png"),
  wallet: () => require("../../assets/illus-wallet.png"),
  notifications: () => require("../../assets/illus-notifications.png"),
  empty: () => require("../../assets/illus-empty.png"),
};

function IllustrationBase({
  name,
  size = 168,
}: {
  name: IllustrationName;
  size?: number;
}) {
  const [source, setSource] = useState<ImageSourcePropType | null>(null);
  useEffect(() => {
    // Deferred one tick: the screen paints its text and controls first, the
    // decorative artwork arrives right after.
    const handle = setTimeout(() => setSource(LOADERS[name]()), 0);
    return () => clearTimeout(handle);
  }, [name]);
  if (!source)
    return <View pointerEvents="none" style={{ width: size, height: size }} />;
  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(DURATION.base)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, alignSelf: "center" }}
    >
      <Image
        source={source}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    </Animated.View>
  );
}

export const Illustration = React.memo(IllustrationBase);
