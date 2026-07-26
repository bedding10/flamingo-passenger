import React, { useMemo, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import { useTheme } from "../core/theme-store";
import type { Palette } from "../core/theme";
import { RADIUS, SHADOW, TYPE } from "../core/design";
import { PressScale } from "./PressScale";

// Shared UI styles, built from the ACTIVE palette (light / dark). Screens call
// `useUi()` instead of importing a static stylesheet so every colour follows
// the theme. No literal #RRGGBB below: everything comes from the palette.
export function makeUi(palette: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    header: { minHeight: 62, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface },
    back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    backText: { fontSize: 38, color: palette.text, lineHeight: 42 },
    title: { flex: 1, textAlign: "center", color: palette.text, fontSize: 18, fontWeight: "800" },
    scroll: { padding: 16, paddingBottom: 44 },
    body: { gap: 12 },
    card: { backgroundColor: palette.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: palette.border, gap: 6, ...SHADOW.card },
    primary: { minHeight: 58, borderRadius: RADIUS.md, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, ...SHADOW.card },
    destructive: { backgroundColor: palette.danger },
    disabled: { opacity: 0.35 },
    primaryText: { color: palette.onPrimary, fontSize: 16, fontWeight: "800" },
    secondary: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
    secondaryText: { color: palette.text, fontSize: 15, fontWeight: "700" },
    fieldWrap: { gap: 7 },
    fieldLabel: { fontSize: 13, color: palette.textMuted, fontWeight: "700" },
    field: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceAlt, color: palette.text, paddingHorizontal: 14, fontSize: 16 },
    multiline: { minHeight: 118, paddingTop: 14, textAlignVertical: "top" },
    center: { paddingVertical: 38, alignItems: "center" },
    message: { padding: 14, borderRadius: 14, backgroundColor: palette.surfaceAlt },
    messageDanger: { backgroundColor: palette.surfaceAlt },
    messageText: { color: palette.textMuted, lineHeight: 20 },
    messageDangerText: { color: palette.danger },
    row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: palette.border, paddingVertical: 10 },
    rowText: { flex: 1, gap: 3 },
    rowTitle: { color: palette.text, fontSize: 16, fontWeight: "700" },
    rowSubtitle: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
    rowValue: { color: palette.text, fontSize: 14, fontWeight: "700" },
    chevron: { color: palette.textMuted, fontSize: 28 },
    section: { color: palette.textMuted, fontSize: 12, fontWeight: "800", letterSpacing: 0.8, marginTop: 8 },
    heroValue: { color: palette.text, fontSize: 34, fontWeight: "900" },
    heroLabel: { color: palette.textMuted, fontSize: 13, marginTop: 4 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { minHeight: 42, paddingHorizontal: 14, borderRadius: 21, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, alignItems: "center", justifyContent: "center" },
    chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    chipText: { color: palette.text, fontWeight: "700" },
    chipTextActive: { color: palette.onPrimary },
    divider: { height: 1, backgroundColor: palette.border },
    warning: { color: palette.accent, fontSize: 13, lineHeight: 19 },
    success: { color: palette.accent, fontSize: 14, fontWeight: "700" },
    dangerText: { color: palette.danger, fontSize: 14, fontWeight: "700" },
    caption: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
    h2: { ...TYPE.heading, color: palette.text },
    paragraph: { color: palette.text, fontSize: 15, lineHeight: 24 },
  });
}

export type Ui = ReturnType<typeof makeUi>;

// Themed shared styles. Every screen: `const ui = useUi();`
export function useUi(): Ui {
  const { palette } = useTheme();
  return useMemo(() => makeUi(palette), [palette]);
}

export function Screen({ title, onBack, children, scroll = true }: { title: string; onBack?: () => void; children: ReactNode; scroll?: boolean }) {
  const ui = useUi();
  const body = <Animated.View entering={FadeIn.duration(220)} style={ui.body}>{children}</Animated.View>;
  return <SafeAreaView style={ui.safe}><View style={ui.header}>{onBack ? <Pressable accessibilityRole="button" onPress={onBack} style={ui.back}><Text style={ui.backText}>‹</Text></Pressable> : <View style={ui.back} />}<Text numberOfLines={1} style={ui.title}>{title}</Text><View style={ui.back} /></View>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll}>{body}</ScrollView> : body}</SafeAreaView>;
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
  const { palette } = useTheme();
  return <View style={ui.center}><ActivityIndicator color={palette.text} /></View>;
}
export function Message({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  const ui = useUi();
  return <View style={[ui.message, danger && ui.messageDanger]}><Text style={[ui.messageText, danger && ui.messageDangerText]}>{children}</Text></View>;
}
export function Row({ title, subtitle, value, onPress }: { title: string; subtitle?: string; value?: string; onPress?: () => void }) {
  const ui = useUi();
  const content = <View style={ui.row}><View style={ui.rowText}><Text style={ui.rowTitle}>{title}</Text>{subtitle ? <Text numberOfLines={2} style={ui.rowSubtitle}>{subtitle}</Text> : null}</View>{value ? <Text style={ui.rowValue}>{value}</Text> : null}{onPress ? <Text style={ui.chevron}>›</Text> : null}</View>;
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}
export const money = (amount: number | string | undefined | null, currency?: string) => amount == null ? "" : `${Number(amount).toFixed(2)}${currency ? ` ${currency}` : ""}`;
export const day = (value?: string | null, locale = "en") => value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";
