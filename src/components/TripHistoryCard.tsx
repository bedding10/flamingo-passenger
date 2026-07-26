import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import Animated from "react-native-reanimated";
import { Clock, Route as RouteIcon, Star } from "lucide-react-native";
import { PressScale } from "./PressScale";
import { day, money } from "./PassengerScreen";
import { tr } from "../core/i18n";
import { RADIUS, SHADOW, SPACING, TYPE } from "../core/design";
import { useTheme } from "../core/theme-store";
import { mapStyleFor, withAlpha, type Palette } from "../core/theme";
import type { Trip } from "../core/contracts";

// Great-circle distance in kilometres; enough precision for a history card.
function distanceKm(trip: Trip): number | null {
  const { pickupLat, pickupLng, destLat, destLng } = trip;
  if (pickupLat == null || pickupLng == null || destLat == null || destLng == null) {
    return null;
  }
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(destLat - pickupLat);
  const dLng = toRad(destLng - pickupLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pickupLat)) * Math.cos(toRad(destLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Ride duration, when the backend exposes both timestamps.
function durationMinutes(trip: Trip): number | null {
  const started = trip.startedAt ?? trip.acceptedAt ?? trip.createdAt;
  const ended = trip.completedAt ?? trip.finishedAt;
  if (typeof started !== "string" || typeof ended !== "string") return null;
  const value = (new Date(ended).getTime() - new Date(started).getTime()) / 60000;
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function TripHistoryCardBase({
  trip,
  locale,
  messages,
  onPress,
}: {
  trip: Trip;
  locale: string;
  messages: Record<string, string>;
  onPress: () => void;
}) {
  const { palette, name: themeName } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const mapStyle = useMemo(() => mapStyleFor(themeName), [themeName]);

  const hasRoute =
    trip.pickupLat != null &&
    trip.pickupLng != null &&
    trip.destLat != null &&
    trip.destLng != null;
  const region = hasRoute
    ? {
        latitude: (trip.pickupLat! + trip.destLat!) / 2,
        longitude: (trip.pickupLng! + trip.destLng!) / 2,
        latitudeDelta: Math.max(0.01, Math.abs(trip.pickupLat! - trip.destLat!) * 2.4),
        longitudeDelta: Math.max(0.01, Math.abs(trip.pickupLng! - trip.destLng!) * 2.4),
      }
    : null;

  const km = distanceKm(trip);
  const minutes = durationMinutes(trip);
  const rating = typeof trip.rating === "number" ? trip.rating : trip.driver?.rating;
  const vehicle = [trip.vehicle?.make, trip.vehicle?.model].filter(Boolean).join(" ");

  return (
    <PressScale
      accessibilityLabel={trip.destAddress ?? tr(messages, "trips.details")}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.row}>
        {/* Mini map: lite mode keeps long lists smooth on Android. */}
        <View style={styles.mapBox}>
          {region ? (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={region}
              customMapStyle={mapStyle}
              liteMode
              pointerEvents="none"
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
            >
              <Polyline
                coordinates={[
                  { latitude: trip.pickupLat!, longitude: trip.pickupLng! },
                  { latitude: trip.destLat!, longitude: trip.destLng! },
                ]}
                strokeColor={palette.accent}
                strokeWidth={3}
              />
              <Marker
                coordinate={{ latitude: trip.pickupLat!, longitude: trip.pickupLng! }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.pickupDot} />
              </Marker>
              <Marker
                coordinate={{ latitude: trip.destLat!, longitude: trip.destLng! }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.destDot} />
              </Marker>
            </MapView>
          ) : (
            <View style={styles.mapFallback}>
              <RouteIcon size={22} color={palette.textMuted} strokeWidth={2} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text numberOfLines={1} style={styles.destination}>
            {trip.destAddress ?? tr(messages, "trips.destinationUnavailable")}
          </Text>
          <Text numberOfLines={1} style={styles.pickup}>
            {trip.pickupAddress ?? ""}
          </Text>
          <View style={styles.metaRow}>
            {km != null ? (
              <View style={styles.meta}>
                <RouteIcon size={13} color={palette.textMuted} strokeWidth={2.2} />
                <Text style={styles.metaText}>{`${km.toFixed(1)} ${tr(messages, "trips.km")}`}</Text>
              </View>
            ) : null}
            {minutes != null ? (
              <View style={styles.meta}>
                <Clock size={13} color={palette.textMuted} strokeWidth={2.2} />
                <Text style={styles.metaText}>{`${minutes} ${tr(messages, "home.eta")}`}</Text>
              </View>
            ) : null}
            {rating != null ? (
              <View style={styles.meta}>
                <Star size={13} color={palette.accent} strokeWidth={2.4} />
                <Text style={styles.metaGold}>{rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
          {trip.driver?.name || vehicle ? (
            <Text numberOfLines={1} style={styles.driver}>
              {[trip.driver?.name, vehicle].filter(Boolean).join(" \u00b7 ")}
            </Text>
          ) : null}
        </View>

        <View style={styles.side}>
          {/* Shared element: the fare flies into the details screen. */}
          <Animated.Text
            sharedTransitionTag={`trip-fare-${trip.id}`}
            style={styles.fare}
          >
            {money(trip.fare, trip.currency)}
          </Animated.Text>
          <Text style={styles.date}>{day(trip.createdAt as string | undefined, locale)}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>
              {tr(messages, `trip.status.${trip.status}`)}
            </Text>
          </View>
        </View>
      </View>
    </PressScale>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    card: {
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      ...SHADOW.card,
    },
    row: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
    mapBox: {
      width: 84,
      height: 84,
      borderRadius: RADIUS.md,
      overflow: "hidden",
      backgroundColor: palette.surfaceAlt,
    },
    mapFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
    pickupDot: {
      width: 10,
      height: 10,
      borderRadius: RADIUS.pill,
      backgroundColor: palette.primary,
      borderWidth: 2,
      borderColor: palette.onPrimary,
    },
    destDot: {
      width: 10,
      height: 10,
      borderRadius: RADIUS.pill,
      backgroundColor: palette.accent,
      borderWidth: 2,
      borderColor: palette.onAccent,
    },
    body: { flex: 1, gap: 2 },
    destination: { ...TYPE.bodyStrong, color: palette.text },
    pickup: { ...TYPE.caption, color: palette.textMuted },
    metaRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginTop: 2 },
    meta: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { ...TYPE.caption, color: palette.textMuted },
    metaGold: { ...TYPE.caption, color: palette.accent, fontWeight: "800" },
    driver: { ...TYPE.caption, color: palette.textMuted },
    side: { alignItems: "flex-end", gap: 4 },
    fare: { ...TYPE.heading, color: palette.text },
    date: { ...TYPE.caption, color: palette.textMuted },
    statusPill: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
      backgroundColor: withAlpha(palette.accent, 0.14),
    },
    statusText: { ...TYPE.overline, color: palette.accent },
  });
}

export const TripHistoryCard = React.memo(TripHistoryCardBase);
