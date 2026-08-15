import React, { useMemo, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import { useTheme } from "../core/theme-store";
import { withAlpha, type Palette } from "../core/theme";
import { TYPE } from "../core/design";
import { colors, radius, spacing, touchTarget, typography } from "../design/theme";
import { useTextDirection, type TextDirection } from "../core/text-direction";
import { PressScale } from "./PressScale";

// Shared UI styles, built from the ACTIVE palette (light / dark).
//
// UNIFIED with `components/menu/MenuScaffold.tsx`: both scaffolds now draw from
// the same root tokens in `src/design/theme.ts` (radius / spacing / typography /
// touchTarget) so a card, a button, an input and a spinner look identical on
// every screen of the app. The style KEYS below are unchanged, so no consuming
// screen needed an edit.
//
// No literal #RRGGBB below: everything comes from the palette or the tokens.
export function makeUi(palette: Palette, dir?: TextDirection) {
  const textAlign = dir?.textAlign ?? "left";
  const writingDirection = dir?.writingDirection ?? "ltr";
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    header: { minHeight: 62, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border, backgroundColor: palette.surface },
    back: { width: touchTarget - 14, height: touchTarget - 14, alignItems: "center", justifyContent: "center" },
    // Gold chevron, matching the drawer pages' back control.
    backText: { fontSize: 34, color: colors.gold, lineHeight: 40 },
    title: { flex: 1, textAlign: "center", color: palette.text, ...typography.title },
    scroll: { padding: spacing.lg, paddingBottom: spacing["4xl"] },
    body: { gap: spacing.md },
    // Card: same surface, radius, hairline border and padding as MenuScaffold.
    card: { backgroundColor: palette.surfaceAlt, borderRadius: radius.lg, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border, gap: spacing.sm },
    // Primary CTA: brand gold with ink label, identical to `PrimaryAction`.
    primary: { minHeight: touchTarget, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
    destructive: { backgroundColor: palette.danger },
    disabled: { opacity: 0.4 },
    primaryText: { ...typography.subtitle, fontWeight: "800", color: colors.ink },
    // Secondary CTA: gold hairline outline, identical to `GhostAction`.
    secondary: { minHeight: touchTarget, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.transparent, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
    secondaryText: { ...typography.subtitle, fontWeight: "700", color: palette.text },
    fieldWrap: { gap: spacing.xs },
    fieldLabel: { ...typography.caption, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: palette.textMuted, textAlign, writingDirection },
    field: { minHeight: touchTarget, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text, paddingHorizontal: spacing.md, ...typography.subtitle, textAlign, writingDirection },
    multiline: { minHeight: 160, paddingTop: spacing.md, textAlignVertical: "top" },
    center: { paddingVertical: spacing["4xl"], alignItems: "center" },
    message: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold, backgroundColor: withAlpha(colors.gold, 0.1) },
    messageDanger: { borderColor: palette.danger, backgroundColor: withAlpha(colors.danger, 0.1) },
    messageText: { ...typography.body, fontWeight: "600", color: colors.gold, textAlign, writingDirection },
    messageDangerText: { color: palette.danger },
    row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border, paddingVertical: spacing.sm },
    rowText: { flex: 1, gap: 3 },
    rowTitle: { ...typography.body, fontWeight: "600", color: palette.text, textAlign, writingDirection },
    rowSubtitle: { ...typography.caption, color: palette.textMuted, textAlign, writingDirection },
    rowValue: { ...typography.subtitle, fontWeight: "800", color: colors.gold },
    chevron: { color: palette.textMuted, fontSize: 28 },
    section: { ...typography.caption, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, color: palette.textMuted, marginTop: spacing.sm, textAlign, writingDirection },
    heroValue: { ...typography.display, color: palette.text, textAlign, writingDirection },
    heroLabel: { ...typography.caption, color: palette.textMuted, marginTop: spacing.xs, textAlign, writingDirection },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" },
    chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    chipText: { ...typography.body, fontWeight: "700", color: palette.text },
    chipTextActive: { color: colors.ink },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border },
    warning: { ...typography.caption, color: colors.gold, textAlign, writingDirection },
    success: { ...typography.body, fontWeight: "700", color: colors.gold, textAlign, writingDirection },
    dangerText: { ...typography.body, fontWeight: "700", color: palette.danger, textAlign, writingDirection },
    caption: { ...typography.caption, color: palette.textMuted, textAlign, writingDirection },
    h2: { ...TYPE.heading, color: palette.text, textAlign, writingDirection },
    paragraph: { ...typography.body, lineHeight: 24, color: palette.text, textAlign, writingDirection },
  });
}

export type Ui = ReturnType<typeof makeUi>;

// Themed shared styles. Every screen: `const ui = useUi();`
export function useUi(): Ui {
  const { palette } = useTheme();
  const dir = useTextDirection();
  return useMemo(() => makeUi(palette, dir), [palette, dir]);
}

export function Screen({ title, onBack, children, scroll = true }: { title: string; onBack?: () => void; children: ReactNode; scroll?: boolean }) {
  const ui = useUi();
  const { isRTLText } = useTextDirection();
  const body = <Animated.View entering={FadeIn.duration(220)} style={ui.body}>{children}</Animated.View>;
  return <SafeAreaView style={ui.safe}><View style={ui.header}>{onBack ? <Pressable accessibilityRole="button" onPress={onBack} style={ui.back}><Text style={ui.backText}>{isRTLText ? "\u203A" : "\u2039"}</Text></Pressable> : <View style={ui.back} />}<Text numberOfLines={1} style={ui.title}>{title}</Text><View style={ui.back} /></View>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll}>{body}</ScrollView> : body}</SafeAreaView>;
}
export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const ui = useUi();
  const content = <Animated.View entering={SlideInRight.springify().damping(20)} style={ui.card}>{children}</Animated.View>;
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}
export function PrimaryButton({ label, onPress, disabled, destructive = false }: { label: string; onPress: () => void; disabled?: boolean; destructive?: boolean }) {
  const ui = useUi();
  return <PressScale accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[ui.primary, destructive && ui.destructive, disabled && ui.disabled]}><Text style={ui.primaryText}>{label}</Text></PressScale>;
}
export function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const ui = useUi();
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[ui.secondary, disabled && ui.disabled]}><Text style={ui.secondaryText}>{label}</Text></Pressable>;
}
export function Field({ value, onChangeText, label, multiline, keyboardType, secureTextEntry }: { value: string; onChangeText: (value: string) => void; label: string; multiline?: boolean; keyboardType?: KeyboardTypeOptions; secureTextEntry?: boolean }) {
  const ui = useUi();
  const { palette } = useTheme();
  return <View style={ui.fieldWrap}><Text style={ui.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} multiline={multiline} keyboardType={keyboardType} secureTextEntry={secureTextEntry} placeholderTextColor={palette.textMuted} style={[ui.field, multiline && ui.multiline]} /></View>;
}
export function Loading() {
  const ui = useUi();
  // Gold spinner, matching MenuScaffold's loading state.
  return <View style={ui.center}><ActivityIndicator color={colors.gold} /></View>;
}
export function Message({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  const ui = useUi();
  return <View style={[ui.message, danger && ui.messageDanger]}><Text style={[ui.messageText, danger && ui.messageDangerText]}>{children}</Text></View>;
}
export function Row({ title, subtitle, value, onPress }: { title: string; subtitle?: string; value?: string; onPress?: () => void }) {
  const ui = useUi();
  const { isRTLText } = useTextDirection();
  const content = <View style={ui.row}><View style={ui.rowText}><Text style={ui.rowTitle}>{title}</Text>{subtitle ? <Text numberOfLines={2} style={ui.rowSubtitle}>{subtitle}</Text> : null}</View>{value ? <Text style={ui.rowValue}>{value}</Text> : null}{onPress ? <Text style={ui.chevron}>{isRTLText ? "\u2039" : "\u203A"}</Text> : null}</View>;
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}
export const money = (amount: number | string | undefined | null, currency?: string) => amount == null ? "" : `${Number(amount).toFixed(2)}${currency ? ` ${currency}` : ""}`;
export const day = (value?: string | null, locale = "en") => value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";
