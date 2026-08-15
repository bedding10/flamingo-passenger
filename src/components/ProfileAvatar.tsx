import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SvgXml } from "react-native-svg";

/**
 * Phase 11 - the single avatar component of this app.
 *
 * The photo sits in the middle, the level frame is drawn ON TOP of it. The
 * frame never resizes the photo and never covers the face: the photo keeps a
 * fixed 76% of the box at every size, so Bronze and Legendary crop identically.
 *
 * The frame URL is ALWAYS the `profileFrameUrl` served by the backend. This file
 * contains no R2 host, no object key, no level thresholds and no level mapping:
 * the app never decides what "10 trips" means.
 *
 * Caching (rule 18): the SVG markup is fetched once per URL for the whole app
 * session and kept in a module-level cache keyed by the URL itself. A level
 * change (BRONZE -> SILVER) changes the URL, so it can never be served from a
 * stale cache entry; nothing is fetched on re-render.
 */

/** url -> svg markup. Shared by every mounted avatar. */
const frameCache = new Map<string, string>();
/** URLs that failed once; we do not hammer the network on every render. */
const failedFrames = new Set<string>();

export type ProfileAvatarProps = {
  /** Display URL of the photo, already resolved by the backend. */
  avatarUrl?: string | null;
  /** Level frame URL, served by the backend (profileFrameUrl). */
  frameUrl?: string | null;
  /** Outer box side in points. The photo scales with it. */
  size?: number;
  /** Letter (or short text) shown when there is no usable photo. */
  fallback?: string;
  /** Shows a spinner instead of the photo while the profile is loading. */
  loading?: boolean;
  /** Forces the fallback, e.g. when the caller's own request failed. */
  error?: boolean;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  textColor?: string;
  accessibilityLabel?: string;
};

export function ProfileAvatar({
  avatarUrl,
  frameUrl,
  size = 72,
  fallback,
  loading = false,
  error = false,
  style,
  backgroundColor = "rgba(127,127,127,0.18)",
  textColor = "#D9A520",
  accessibilityLabel,
}: ProfileAvatarProps) {
  const [markup, setMarkup] = useState<string | null>(() =>
    frameUrl ? frameCache.get(frameUrl) ?? null : null,
  );
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!frameUrl) {
      setMarkup(null);
      return;
    }
    const cached = frameCache.get(frameUrl);
    if (cached) {
      setMarkup(cached);
      return;
    }
    if (failedFrames.has(frameUrl)) {
      setMarkup(null);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const response = await fetch(frameUrl);
        if (!response.ok) throw new Error(String(response.status));
        const xml = await response.text();
        frameCache.set(frameUrl, xml);
        if (alive) setMarkup(xml);
      } catch {
        // A missing frame must never hide the photo.
        failedFrames.add(frameUrl);
        if (alive) setMarkup(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [frameUrl]);

  const inner = useMemo(() => Math.round(size * 0.76), [size]);
  const showImage = Boolean(avatarUrl) && !imageFailed && !error && !loading;

  return (
    <View
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel}
      style={[
        { width: size, height: size, alignItems: "center", justifyContent: "center" },
        style,
      ]}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : showImage ? (
          <Image
            source={{ uri: avatarUrl as string }}
            onError={() => setImageFailed(true)}
            style={{ width: inner, height: inner }}
          />
        ) : (
          <Text
            style={{
              color: textColor,
              fontSize: Math.round(inner * 0.42),
              fontWeight: "800",
            }}
          >
            {(fallback ?? "").trim().slice(0, 1).toUpperCase() || "\u2605"}
          </Text>
        )}
      </View>

      {markup ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <SvgXml xml={markup} width="100%" height="100%" />
        </View>
      ) : null}
    </View>
  );
}
