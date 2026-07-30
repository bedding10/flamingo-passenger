import React, { useEffect } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import Animated, { SlideInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import type { Trip } from "../../core/contracts";
import { tr } from "../../core/i18n";
import type { Palette } from "../../core/theme";
import { GoldButton } from "../../components/GoldButton";
import type { Styles } from "./HomeScreen";

export function TripPanel({
  styles,
  palette,
  trip,
  messages,
  payment,
  cancelPending,
  onCancel,
  onCommunicate,
  onClose,
  failure,
  retryPending,
  onRetry,
}: {
  styles: Styles;
  palette: Palette;
  trip: Trip;
  messages: Record<string, string>;
  payment: string | null;
  cancelPending: boolean;
  onCancel: () => void;
  onCommunicate: () => void;
  onClose: () => void;
  /** Terminal matching outcome from the socket; null while the search runs. */
  failure: { kind: "noDrivers" | "error"; code?: string } | null;
  retryPending: boolean;
  onRetry: () => void;
}) {
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.9 + pulse.value * 0.1 }],
  }));
  const completed = trip.status === "COMPLETED",
    searching = trip.status === "SEARCHING";
  // The search ended without a driver: stop pretending it is still running.
  const failed = searching && !!failure;
  const title = completed
    ? "home.tripCompleted"
    : failed
      ? "home.noDrivers.title"
      : trip.status === "IN_PROGRESS"
        ? "home.tripInProgress"
        : searching
          ? "home.searching"
          : "home.driverArriving";
  // A specific server code beats the generic copy: "demand is very high in your
  // area" is actionable, "no driver found" is not.
  const failureText =
    failure?.kind === "error" && failure.code
      ? tr(messages, `error.${failure.code}`)
      : tr(messages, "home.noDrivers.body");
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(20)}
      style={styles.bottomSheet}
    >
      <View style={styles.handle} />
      {searching && !failed ? (
        <Animated.View style={[styles.pulse, pulseStyle]} />
      ) : null}
      <Text style={styles.sheetTitle}>{tr(messages, title)}</Text>
      {failed ? (
        <>
          <Text style={styles.muted}>{failureText}</Text>
          <GoldButton
            label={tr(messages, "home.noDrivers.retry")}
            loading={retryPending}
            onPress={onRetry}
          />
        </>
      ) : searching ? (
        <Text style={styles.muted}>{tr(messages, "home.searchingHint")}</Text>
      ) : null}
      {trip.driver ? (
        <View style={styles.driverCard}>
          <View style={styles.avatar}>
            {trip.driver.avatarUrl ? (
              <Image
                source={{ uri: trip.driver.avatarUrl }}
                style={styles.avatarImage}
              />
            ) : null}
          </View>
          <View style={styles.flex}>
            <Text style={styles.vehicleName}>
              {trip.driver.name ?? tr(messages, "home.driver")}
            </Text>
            {trip.driver.rating != null ? (
              <Text style={styles.muted}>
                {tr(messages, "home.rating")}: {trip.driver.rating}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      <View style={styles.details}>
        <Detail
          styles={styles}
          label={tr(messages, "home.from")}
          value={trip.pickupAddress}
        />
        <Detail
          styles={styles}
          label={tr(messages, "home.to")}
          value={trip.destAddress}
        />
        {trip.vehicle ? (
          <Detail
            styles={styles}
            label={tr(messages, "home.vehicle")}
            value={[trip.vehicle.make, trip.vehicle.model, trip.vehicle.color]
              .filter(Boolean)
              .join(" ")}
          />
        ) : null}
        {trip.vehicle?.plate ? (
          <Detail
            styles={styles}
            label={tr(messages, "home.plate")}
            value={trip.vehicle.plate}
          />
        ) : null}
        <Detail
          styles={styles}
          label={tr(messages, "home.payment")}
          value={payment ? tr(messages, `payment.method.${payment}`) : undefined}
        />
      </View>
      {["ACCEPTED", "ARRIVING", "IN_PROGRESS"].includes(trip.status) ? (
        <Pressable onPress={onCommunicate} style={styles.primaryButton}>
          <Text style={styles.buttonTextLight}>{tr(messages, "communication.title")}</Text>
        </Pressable>
      ) : null}
      {completed ? (
        <Pressable onPress={onClose} style={styles.primaryButton}>
          <Text style={styles.buttonTextLight}>
            {tr(messages, "home.close")}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          disabled={cancelPending || trip.status === "IN_PROGRESS"}
          onPress={onCancel}
          style={[
            styles.secondaryButton,
            trip.status === "IN_PROGRESS" && styles.disabled,
          ]}
        >
          {cancelPending ? (
            <ActivityIndicator color={palette.text} />
          ) : (
            <Text style={styles.buttonTextDark}>
              {tr(messages, "home.cancelRide")}
            </Text>
          )}
        </Pressable>
      )}
    </Animated.View>
  );
}
function Detail({
  styles,
  label,
  value,
}: {
  styles: Styles;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text numberOfLines={2} style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

// Every colour below comes from the active palette — no literal hex values.
