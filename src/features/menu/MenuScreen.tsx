import React, { useCallback, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown, SlideInLeft } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Gift,
  Info,
  LifeBuoy,
  LogOut,
  MapPin,
  Pencil,
  Route as RouteIcon,
  Scale,
  Settings as SettingsIcon,
  Trash2,
  User,
  UserPlus,
  Wallet as WalletIcon,
  Check,
} from "lucide-react-native";
import { Loading, Message, Screen, useUi } from "../../components/PassengerScreen";
import { PressScale } from "../../components/PressScale";
import { tr } from "../../core/i18n";
import type { Locale } from "../../core/contracts";
import { SUPPORTED_LOCALES, useLocaleStore } from "../../core/locale-store";
import { passengerServicesApi, type MenuRoute } from "../../core/passenger-api";
import { useSession } from "../../core/session-store";
import { useMessages } from "../../core/use-messages";
import { useTheme } from "../../core/theme-store";
import { withAlpha, type Palette, type ThemeMode } from "../../core/theme";
import { RADIUS, SHADOW, SPACING, TYPE } from "../../core/design";
import type { RootStackParamList } from "../../navigation/types";

// Flag icons for the in-app language switcher (icons only, no labels), same as
// the auth screen so the language stays switchable after login too.
const FLAGS: Record<Locale, number> = {
  ar: require("../../../assets/flag-ar.png") as number,
  fr: require("../../../assets/flag-fr.png") as number,
  en: require("../../../assets/flag-en.png") as number,
};

type IconComponent = typeof User;

// One flat, deliberately ordered list. Server-driven items
// (passenger.navigation) can hide or rename entries, but the order and the
// icon of every known destination are decided here.
const ORDER: { route: MenuRoute; labelKey: string; icon: IconComponent }[] = [
  { route: "Profile", labelKey: "profile.title", icon: User },
  { route: "Trips", labelKey: "trips.title", icon: RouteIcon },
  { route: "Places", labelKey: "places.title", icon: MapPin },
  { route: "Wallet", labelKey: "wallet.title", icon: WalletIcon },
  { route: "Subscriptions", labelKey: "subscriptions.title", icon: CreditCard },
  { route: "Coupons", labelKey: "coupons.title", icon: Gift },
  { route: "Referrals", labelKey: "referrals.title", icon: UserPlus },
  { route: "Notifications", labelKey: "notifications.title", icon: Bell },
  { route: "Support", labelKey: "support.title", icon: LifeBuoy },
  { route: "Settings", labelKey: "settings.title", icon: SettingsIcon },
  { route: "About", labelKey: "about.title", icon: Info },
  { route: "Legal", labelKey: "legal.title", icon: Scale },
  { route: "DeleteAccount", labelKey: "accountDeletion.title", icon: Trash2 },
];

// Wallet, coupons and help must always be reachable even if the dashboard
// navigation payload has not been configured yet.
const PILLARS: MenuRoute[] = ["Profile", "Trips", "Wallet", "Coupons", "Support", "Settings"];

const THEME_MODE_KEYS: { mode: ThemeMode; labelKey: string }[] = [
  { mode: "light", labelKey: "theme.light" },
  { mode: "dark", labelKey: "theme.dark" },
  { mode: "system", labelKey: "theme.system" },
];

// Loyalty tier derived from completed trips; purely presentational.
function levelKey(trips: number): string {
  if (trips >= 75) return "menu.level.gold";
  if (trips >= 25) return "menu.level.silver";
  if (trips >= 5) return "menu.level.bronze";
  return "menu.level.new";
}

type Props = NativeStackScreenProps<RootStackParamList, "Menu">;

export function MenuScreen({ navigation }: Props) {
  const ui = useUi();
  const { palette, name: themeName, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const profile = useSession((state) => state.profile);
  const restore = useSession((state) => state.restore);
  const logout = useSession((state) => state.logout);
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const { messages } = useMessages();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? "");
  const saveName = useMutation({
    mutationFn: () => passengerServicesApi.updateProfile({ name: name.trim() }),
    onSuccess: async () => {
      setEditing(false);
      await restore();
    },
  });
  const config = useQuery({
    queryKey: ["passenger-config"],
    queryFn: passengerServicesApi.config,
    staleTime: 60_000,
  });

  // Server items decide what is visible and how it is labelled; ORDER decides
  // the sequence and the icon.
  const items = useMemo(() => {
    const serverItems =
      config.data?.settings["passenger.navigation"]?.items.filter((item) => item.enabled) ?? [];
    const labelFor = (route: MenuRoute, fallback: string) =>
      serverItems.find((item) => item.route === route)?.labelKey ?? fallback;
    const visible = (route: MenuRoute) =>
      serverItems.length === 0 ||
      PILLARS.includes(route) ||
      serverItems.some((item) => item.route === route);
    const known = ORDER.filter((entry) => visible(entry.route)).map((entry) => ({
      ...entry,
      labelKey: labelFor(entry.route, entry.labelKey),
    }));
    const extra = serverItems
      .filter((item) => !ORDER.some((entry) => entry.route === item.route))
      .map((item) => ({ route: item.route, labelKey: item.labelKey, icon: ChevronRight }));
    return [...known, ...extra];
  }, [config.data]);

  const trips = profile?.tripCount ?? 0;
  const rating = profile?.rating;
  const ratingCount = profile?.ratingCount ?? 0;
  const avatarUrl = profile?.avatarUrl ?? null;
  const open = useCallback(
    (route: MenuRoute) =>
      navigation.navigate(route as MenuRoute & keyof RootStackParamList),
    [navigation],
  );

  return (
    <Screen title={tr(messages, "menu.title")} onBack={navigation.goBack}>
      {/* Frosted identity header: photo, name, phone, tier and trip count. */}
      <Animated.View entering={FadeInDown.springify().damping(19)} style={styles.header}>
        <BlurView
          intensity={28}
          tint={themeName === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarLetter}>
                {(profile?.name ?? "?").trim().charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.headerText}>
            {editing ? (
              <TextInput
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={60}
                placeholderTextColor={palette.textMuted}
                style={ui.field}
              />
            ) : (
              <View style={styles.nameRow}>
                <Text numberOfLines={1} style={styles.name}>
                  {profile?.name}
                </Text>
                <Text
                  accessibilityLabel={`${rating ?? 0} / 5 (${ratingCount})`}
                  style={styles.rating}
                >
                  {"\u2605"} {rating != null ? rating.toFixed(1) : "\u2013"}
                </Text>
              </View>
            )}
            <Text style={styles.phone}>{profile?.phone}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{tr(messages, levelKey(trips))}</Text>
              </View>
              <Text style={styles.tripCount}>
                {trips} {tr(messages, "trips.title")}
              </Text>
            </View>
          </View>
          <PressScale
            accessibilityLabel={tr(messages, "menu.editName")}
            disabled={saveName.isPending}
            onPress={() => (editing ? name.trim() && saveName.mutate() : setEditing(true))}
            style={styles.editButton}
          >
            {editing ? (
              <Check size={19} color={palette.accent} strokeWidth={2.4} />
            ) : (
              <Pencil size={17} color={palette.text} strokeWidth={2.2} />
            )}
          </PressScale>
        </View>
        {saveName.isError ? <Message danger>{tr(messages, "common.error")}</Message> : null}
      </Animated.View>

      <View style={styles.divider} />

      {config.isPending ? (
        <Loading />
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <Animated.View
                key={item.route}
                entering={SlideInLeft.delay(Math.min(index, 8) * 24).springify().damping(20)}
              >
                <PressScale
                  accessibilityLabel={tr(messages, item.labelKey)}
                  onPress={() => open(item.route)}
                  style={styles.item}
                >
                  <View style={styles.itemIcon}>
                    <Icon size={19} color={palette.text} strokeWidth={2} />
                  </View>
                  <Text numberOfLines={1} style={styles.itemLabel}>
                    {tr(messages, item.labelKey)}
                  </Text>
                  <ChevronRight size={18} color={palette.textMuted} strokeWidth={2} />
                </PressScale>
              </Animated.View>
            );
          })}
        </View>
      )}

      <View style={styles.divider} />

      {/* Language (flags) and appearance (light / dark / system). */}
      <Text style={ui.section}>{tr(messages, "menu.group.settings")}</Text>
      <View style={styles.settings}>
        <Text style={ui.fieldLabel}>{tr(messages, "settings.language")}</Text>
        <View style={styles.flagRow}>
          {SUPPORTED_LOCALES.map((value) => (
            <PressScale
              key={value}
              accessibilityLabel={`language: ${value}`}
              onPress={() => void setLocale(value)}
              style={[styles.flag, value === locale && styles.flagActive]}
            >
              <Image source={FLAGS[value]} style={styles.flagImage} />
            </PressScale>
          ))}
        </View>
        <Text style={ui.fieldLabel}>{tr(messages, "theme.title")}</Text>
        <View style={styles.segment}>
          {THEME_MODE_KEYS.map((option) => (
            <Pressable
              key={option.mode}
              accessibilityRole="button"
              accessibilityState={{ selected: option.mode === mode }}
              onPress={() => setMode(option.mode)}
              style={[styles.segmentItem, option.mode === mode && styles.segmentItemActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  option.mode === mode && styles.segmentTextActive,
                ]}
              >
                {tr(messages, option.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <PressScale
        accessibilityLabel={tr(messages, "menu.logout")}
        onPress={() => void logout()}
        style={styles.logout}
      >
        <LogOut size={19} color={palette.danger} strokeWidth={2.2} />
        <Text style={styles.logoutText}>{tr(messages, "menu.logout")}</Text>
      </PressScale>
    </Screen>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    header: {
      borderRadius: RADIUS.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: withAlpha(palette.surface, 0.7),
      padding: SPACING.lg,
      ...SHADOW.card,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: RADIUS.pill,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: { width: 64, height: 64 },
    avatarLetter: { color: palette.onPrimary, fontSize: 25, fontWeight: "900" },
    headerText: { flex: 1, gap: 3 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
    name: { ...TYPE.heading, color: palette.text, flexShrink: 1 },
    rating: { ...TYPE.caption, color: palette.accent, fontWeight: "800" },
    phone: { ...TYPE.caption, color: palette.textMuted },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: 2 },
    levelBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
      backgroundColor: withAlpha(palette.accent, 0.16),
    },
    levelText: { ...TYPE.overline, color: palette.accent },
    tripCount: { ...TYPE.caption, color: palette.textMuted },
    editButton: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    divider: {
      height: 1,
      backgroundColor: withAlpha(palette.border, 0.9),
      marginVertical: SPACING.lg,
    },
    list: { gap: SPACING.xs },
    item: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: palette.surface,
    },
    itemIcon: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surfaceAlt,
    },
    itemLabel: { ...TYPE.bodyStrong, color: palette.text, flex: 1 },
    settings: { gap: SPACING.sm },
    flagRow: { flexDirection: "row", gap: SPACING.md },
    flag: {
      width: 52,
      height: 52,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    flagActive: { borderWidth: 2, borderColor: palette.accent },
    flagImage: { width: 34, height: 34, borderRadius: RADIUS.pill },
    segment: {
      flexDirection: "row",
      padding: 4,
      gap: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: palette.surfaceAlt,
    },
    segmentItem: {
      flex: 1,
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: RADIUS.pill,
    },
    segmentItemActive: { backgroundColor: palette.primary },
    segmentText: { ...TYPE.caption, color: palette.textMuted, fontWeight: "800" },
    segmentTextActive: { color: palette.onPrimary },
    logout: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
      marginTop: SPACING.lg,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: withAlpha(palette.danger, 0.4),
      backgroundColor: withAlpha(palette.danger, 0.08),
    },
    logoutText: { ...TYPE.bodyStrong, color: palette.danger },
  });
}
