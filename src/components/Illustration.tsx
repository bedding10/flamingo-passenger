import React, { useEffect, useState } from "react";
import { Image, View, type ImageSourcePropType } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { DURATION } from "../core/design";
import { managedAsset } from "../core/assets";

/**
 * Decorative artwork shown at the top of a screen or inside an empty state.
 *
 * Loading strategy (server first, bundle second):
 * 1. If the managed-asset manifest already has `illus.<name>` on disk, that
 *    file is used. Artwork can then be restyled from the backend without
 *    shipping a new APK.
 * 2. Otherwise a small bundled WebP is used, so a first launch on a bad
 *    network still renders correctly. The bundled copies are WebP and cost
 *    ~66 KB in total, versus ~191 KB as PNG.
 *
 * Rendering rules: memoised, resolved lazily on first paint, never re-rendered,
 * no touch handling, hidden from screen readers.
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
  profile: () => require("../../assets/illus-profile.webp"),
  promotions: () => require("../../assets/illus-promotions.webp"),
  trips: () => require("../../assets/illus-trips.webp"),
  help: () => require("../../assets/illus-help.webp"),
  wallet: () => require("../../assets/illus-wallet.webp"),
  notifications: () => require("../../assets/illus-notifications.webp"),
  empty: () => require("../../assets/illus-empty.webp"),
};

function resolve(name: IllustrationName): ImageSourcePropType {
  const remote = managedAsset(`illus.${name}`);
  return remote ? { uri: remote.localUri } : LOADERS[name]();
}

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
    const handle = setTimeout(() => setSource(resolve(name)), 0);
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
