import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { FareOffer } from "../../core/contracts";
import type { Palette } from "../../core/theme";
import { tr } from "../../core/i18n";
import { a11yButton, announce } from "../../core/a11y";
import { PriceStepper } from "../../components/PriceStepper";
import { GoldButton } from "../../components/GoldButton";
import type { Styles } from "./HomeScreen";

// Accept button that visually drains as the offer expires: a solid fill
// shrinks from full width to zero, and a clipped light label keeps the text
// readable on both the filled and the empty part of the button.
function AcceptButton({
  styles,
  label,
  expiresAt,
  onPress,
}: {
  styles: Styles;
  label: string;
  expiresAt?: string;
  onPress: () => void;
}) {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(1);
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      progress.value = 1;
      setSeconds(null);
      return;
    }
    const target = new Date(expiresAt).getTime();
    const left = () => Math.max(0, target - Date.now());
    const total = Math.max(1, left());
    progress.value = 1;
    progress.value = withTiming(0, { duration: total, easing: Easing.linear });
    setSeconds(Math.ceil(total / 1000));
    const timer = setInterval(
      () => setSeconds(Math.ceil(left() / 1000)),
      500,
    );
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const fill = useAnimatedStyle(() => ({
    width: width * progress.value,
  }));
  const text = seconds != null ? `${label}  ·  ${seconds}` : label;

  return (
    <Pressable
      onPress={onPress}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.acceptButton}
    >
      {/* empty-state label (dark text on the drained track) */}
      <Text style={styles.acceptTextIdle}>{text}</Text>
      {/* draining fill + the same label clipped inside it */}
      <Animated.View style={[styles.acceptFill, fill]}>
        <View style={[styles.acceptFillInner, { width: width || undefined }]}>
          <Text style={styles.acceptTextActive}>{text}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// inDrive-style bargaining: the passenger names a price, adds an optional
// message for drivers, and answers every driver offer with accept or dismiss.
export function NegotiationPanel({
  styles,
  messages,
  proposed,
  placeholderColor,
  setProposed,
  note,
  setNote,
  palette,
  suggested,
  offers,
  onSend,
  onAccept,
  onDismiss,
  onBack,
}: {
  styles: Styles;
  messages: Record<string, string>;
  proposed: string;
  placeholderColor: string;
  setProposed: (x: string) => void;
  note: string;
  setNote: (x: string) => void;
  palette: Palette;
  suggested?: number;
  offers: FareOffer[];
  onSend: () => void;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onBack: () => void;
}) {
  const value = Number(proposed);
  const canSend = Number.isFinite(value) && value > 0;
  const offerCount = offers.length;
  useEffect(() => {
    if (offerCount > 0) {
      announce(`${tr(messages, "home.driverOffers")}: ${offerCount}`);
    }
  }, [messages, offerCount]);
  // Cheapest first, exactly like inDrive's offer list.
  const sorted = useMemo(
    () => [...offers].sort((a, b) => a.fare - b.fare),
    [offers],
  );
  return (
    <Animated.View entering={FadeIn}>
      <Text style={styles.sheetTitle}>
        {tr(messages, "home.negotiationTitle")}
      </Text>
      <Text style={styles.muted}>{tr(messages, "home.negotiationHint")}</Text>

      {/* price: drag the gold track, tap - / +, or type it directly */}
      <PriceStepper
        value={proposed}
        onChange={setProposed}
        suggested={suggested}
        decreaseLabel={tr(messages, "home.priceDown")}
        increaseLabel={tr(messages, "home.priceUp")}
      />
      {suggested != null ? (
        <Text style={styles.muted}>
          {`${tr(messages, "home.suggestedFare")}: ${suggested}`}
        </Text>
      ) : null}

      {/* message shown to drivers with the price */}
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={tr(messages, "home.messagePlaceholder")}
        placeholderTextColor={placeholderColor}
        multiline
        maxLength={140}
        style={styles.noteInput}
      />

      <View style={styles.ctaWrap}>
        <GoldButton
          label={tr(messages, "home.sendOffer")}
          disabled={!canSend}
          onPress={onSend}
        />
      </View>

      <Text style={[styles.label, { marginTop: 16 }]}>
        {`${tr(messages, "home.driverOffers")}${sorted.length ? ` (${sorted.length})` : ""}`}
      </Text>
      {sorted.length ? (
        sorted.map((offer, index) => (
          <View key={offer.id} style={styles.offerCard}>
            <View style={styles.offerHead}>
              <View style={styles.flex}>
                <Text style={styles.vehicleName}>
                  {offer.driver?.name ?? tr(messages, "home.driver")}
                </Text>
                {offer.driver?.rating != null ? (
                  <Text style={styles.muted}>{`★ ${offer.driver.rating}`}</Text>
                ) : null}
              </View>
              <View
                style={styles.offerPriceBox}
                {...a11yValue(tr(messages, "home.price"), offer.fare)}
              >
                <Text style={styles.price}>{offer.fare}</Text>
                {index === 0 && sorted.length > 1 ? (
                  <Text style={styles.bestBadge}>
                    {tr(messages, "home.bestPrice")}
                  </Text>
                ) : null}
              </View>
            </View>
            {offer.note ? (
              <Text style={styles.offerNote}>{offer.note}</Text>
            ) : null}
            {offer.etaMinutes != null ? (
              <Text style={styles.muted}>
                {`${tr(messages, "home.etaMinutes")}: ${offer.etaMinutes}`}
              </Text>
            ) : null}
            <View style={styles.offerActions}>
              <AcceptButton
                styles={styles}
                label={tr(messages, "home.acceptOffer")}
                expiresAt={offer.expiresAt}
                onPress={() => onAccept(offer.id)}
              />
              <Pressable
                {...a11yButton(tr(messages, "home.dismissOffer"), {
                  hint: String(offer.fare),
                })}
                onPress={() => onDismiss(offer.id)}
                style={styles.dismissButton}
              >
                <Text style={styles.dismissText}>
                  {tr(messages, "home.dismissOffer")}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.muted}>{tr(messages, "home.noOffers")}</Text>
      )}
      <Pressable onPress={onBack} style={styles.secondaryButton}>
        <Text style={styles.buttonTextDark}>{tr(messages, "common.back")}</Text>
      </Pressable>
    </Animated.View>
  );
}
