import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { connectionNotice, useConnectivity } from "../core/connectivity";
import { useMessages } from "../core/use-messages";
import { tr } from "../core/i18n";
import { colors } from "../design/theme";
import { useTheme } from "../core/theme-store";

// ---------------------------------------------------------------------------
// Global connection banner.
//
// Previously, losing the network or the trip socket produced NO feedback at
// all: buttons simply stopped responding and the driver marker froze. Every
// serious ride-hailing app surfaces this, because a passenger watching a
// motionless car needs to know whether the car stopped or the phone did.
//
// Rendered once, above the navigator, so it is visible on every screen.
// ---------------------------------------------------------------------------
export function ConnectionBanner() {
  const link = useConnectivity((state) => state.link);
  const socket = useConnectivity((state) => state.socket);
  const notice = connectionNotice(link, socket);
  const { messages } = useMessages();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  // Kept mounted and animated instead of conditionally rendered so the banner
  // slides rather than popping, and so a 200 ms socket blip does not flash.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(notice ? 1 : 0, { duration: 220 });
  }, [notice, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -24 }],
  }));

  if (!notice) return null;

  const offline = notice === "offline";
  const title = offline
    ? tr(messages, "net.offline.title")
    : tr(messages, "net.reconnecting");
  const body = offline ? tr(messages, "net.offline.body") : undefined;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.wrap,
        { paddingTop: insets.top + 6 },
        { backgroundColor: offline ? palette.danger : palette.surface },
        animatedStyle,
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.dot,
            { backgroundColor: offline ? colors.white : palette.accent },
          ]}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            { color: offline ? colors.white : palette.text },
          ]}
        >
          {title}
        </Text>
      </View>
      {body ? (
        <Text numberOfLines={1} style={styles.body}>
          {body}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { flex: 1, fontSize: 13, fontWeight: "700" },
  body: {
    marginTop: 2,
    marginStart: 16,
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
  },
});
