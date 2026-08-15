import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Minus, Plus } from "lucide-react-native";
import { PressScale } from "./PressScale";
import { SHADOW } from "../core/design";
import { colors, radius, spacing, typography } from "../design/theme";
import { useTheme } from "../core/theme-store";
import { withAlpha, type Palette } from "../core/theme";

// Negotiation is the heart of the product: the passenger names the price. The
// stepper keeps the typed field (full freedom) and adds a draggable gold track
// plus - / + buttons so naming a fare takes one thumb and no keyboard.

function round(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function bounds(base: number): { min: number; max: number; step: number } {
  if (!Number.isFinite(base) || base <= 0) {
    return { min: 0, max: 5000, step: 50 };
  }
  const step = base < 1000 ? 10 : 50;
  return {
    min: Math.max(0, round(base * 0.5, step)),
    max: round(base * 2.5, step),
    step,
  };
}

function PriceStepperBase({
  value,
  onChange,
  suggested,
  currency,
  decreaseLabel,
  increaseLabel,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  suggested?: number;
  currency?: string;
  decreaseLabel: string;
  increaseLabel: string;
  placeholder?: string;
}) {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const numeric = Number(value);
  const base = Number.isFinite(numeric) && numeric > 0 ? numeric : suggested ?? 0;
  const range = useMemo(() => bounds(suggested ?? base), [suggested, base]);
  const current = Number.isFinite(numeric) && numeric > 0 ? numeric : range.min;
  const ratio =
    range.max > range.min
      ? Math.min(1, Math.max(0, (current - range.min) / (range.max - range.min)))
      : 0;

  const commit = useCallback(
    (next: number) => {
      const clamped = Math.min(range.max, Math.max(range.min, round(next, range.step)));
      onChange(String(clamped));
    },
    [onChange, range.max, range.min, range.step],
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    widthRef.current = next;
    setWidth(next);
  }, []);

  // PanResponder keeps the drag on the JS thread but only fires on movement,
  // so no extra dependency and no measurable cost while idle.
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const track = widthRef.current;
          if (track <= 0) return;
          const position = Math.min(1, Math.max(0, event.nativeEvent.locationX / track));
          commit(range.min + position * (range.max - range.min));
        },
        onPanResponderMove: (event, gesture) => {
          const track = widthRef.current;
          if (track <= 0) return;
          const position = Math.min(
            1,
            Math.max(0, (event.nativeEvent.locationX + gesture.dx * 0) / track),
          );
          commit(range.min + position * (range.max - range.min));
        },
      }),
    [commit, range.max, range.min],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <PressScale
          accessibilityLabel={decreaseLabel}
          onPress={() => commit(current - range.step)}
          style={styles.stepButton}
        >
          <Minus size={20} color={colors.gold} strokeWidth={2.8} />
        </PressScale>
        <View style={styles.valueBox}>
          <TextInput
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            placeholder={placeholder ?? (suggested != null ? String(suggested) : undefined)}
            placeholderTextColor={palette.textMuted}
            style={styles.valueInput}
          />
          {currency ? <Text style={styles.currency}>{currency}</Text> : null}
        </View>
        <PressScale
          accessibilityLabel={increaseLabel}
          onPress={() => commit(current + range.step)}
          style={[styles.stepButton, styles.stepButtonPlus]}
        >
          <Plus size={20} color={colors.ink} strokeWidth={2.8} />
        </PressScale>
      </View>

      <View style={styles.track} onLayout={onLayout} {...responder.panHandlers}>
        <LinearGradient
          colors={[withAlpha(palette.accent, 0.9), palette.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: Math.max(0, ratio * width) }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.knob,
            { left: Math.max(0, Math.min(width - 26, ratio * width - 13)) },
          ]}
        />
      </View>
      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>{range.min}</Text>
        <Text style={styles.scaleText}>{range.max}</Text>
      </View>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    wrap: { gap: spacing.sm },
    row: {
      /* Circular controls sit at both ends of the price, mirrored in RTL. */
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: spacing.md,
    },
    /* "-": dark surface with a gold ring. */
    stepButton: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.gold,
      backgroundColor: palette.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    /* "+": solid gold. */
    stepButtonPlus: {
      backgroundColor: colors.gold,
      borderColor: colors.gold,
    },
    valueBox: {
      flex: 1,
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      ...SHADOW.card,
    },
    /* The fare is the loudest number on the screen. */
    valueInput: {
      ...typography.banner,
      color: palette.text,
      textAlign: "center",
      minWidth: 90,
      paddingVertical: 0,
    },
    currency: {
      ...typography.caption,
      color: palette.textMuted,
      fontWeight: "800",
    },
    track: {
      height: 26,
      justifyContent: "center",
      borderRadius: radius.pill,
      backgroundColor: palette.surfaceAlt,
      overflow: "hidden",
    },
    fill: { position: "absolute", left: 0, top: 0, bottom: 0 },
    knob: {
      position: "absolute",
      width: 26,
      height: 26,
      borderRadius: radius.pill,
      backgroundColor: palette.surface,
      borderWidth: 2,
      borderColor: colors.gold,
      ...SHADOW.card,
    },
    scaleRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
    },
    scaleText: { ...typography.caption, color: palette.textMuted },
  });
}

export const PriceStepper = React.memo(PriceStepperBase);
