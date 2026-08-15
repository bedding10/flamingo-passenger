import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown, SlideInLeft } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import {
  ChevronRight,
  LifeBuoy,
  LogOut,
  Pencil,
  Route as RouteIcon,
  User,
  Wallet as WalletIcon,
  Check,
} from "lucide-react-native";
import { Loading, Message, Screen } from "../../components/PassengerScreen";
import { PressScale } from "../../components/PressScale";
import { tr } from "../../core/i18n";
import { passengerServicesApi, type MenuRoute } from "../../core/passenger-api";
import { useSession } from "../../core/session-store";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { useMessages } from "../../core/use-messages";
import { useTheme } from "../../core/theme-store";
import { withAlpha, type Palette } from "../../core/theme";
import { RADIUS, SHADOW, SPACING, TYPE } from "../../core/design";
import type { RootStackParamList } from "../../navigation/types";

type IconComponent = typeof User;

// flaminGO drawer: exactly four destinations — account, wallet, trips, help.
// Everything else (promotions, referrals, settings, appearance, legal, …) was
// removed on purpose to keep the drawer premium and minimal.
const ORDER: { route: MenuRoute; labelKey: string; icon: IconComponent }[] = [
  { route: "Profile", labelKey: "profile.title", icon: User },
  { route: "Wallet", labelKey: "wallet.title", icon: WalletIcon },
  { route: "Trips", labelKey: "trips.title", icon: RouteIcon },
  { route: "Support", labelKey: "support.title", icon: LifeBuoy },
];

// The four pillars are always reachable, even without a dashboard payload.
const PILLARS: MenuRoute[] = ["Profile", "Wallet", "Trips", "Support"];

// Loyalty tier derived from completed trips; purely presentational.
// Phase 11 - the LEVEL ITSELF comes from the backend (profile.profileLevel).
// This map is a display lookup only: no thresholds, no "trips >= 10" logic and
// no business decision is taken in the app.
const LEVEL_LABEL_KEYS: Record<string, string> = {
  BRONZE: "menu.level.bronze",
  SILVER: "menu.level.silver",
  GOLD: "menu.level.gold",
  DIAMOND: "menu.level.diamond",
  LEGENDARY: "menu.level.legendary",
};

function levelLabelKey(level?: string | null): string {
  return (level && LEVEL_LABEL_KEYS[level]) || "menu.level.new";
}

type Props = NativeStackScreenProps<RootStackParamList, "Menu">;

export function MenuScreen({ navigation }: Props) {
  const { palette, name: themeName } = useTheme();
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
    // Only the four flaminGO destinations are rendered; server extras are
    // intentionally ignored so the drawer stays minimal.
    return ORDER.filter((entry) => visible(entry.route)).map((entry) => ({
      ...entry,
      labelKey: labelFor(entry.route, entry.labelKey),
    }));
  }, [config.data]);

  // Phase 11: completed trips only, straight from the server.
  const trips = profile?.completedTripsCount ?? profile?.tripCount ?? 0;
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
          <ProfileAvatar
            avatarUrl={avatarUrl}
            frameUrl={profile?.profileFrameUrl}
            size={64}
            fallback={profile?.name ?? "?"}
            textColor={palette.accent}
          />
          <View style={styles.headerText}>
            {editing ? (
              <TextInput
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={60}
                placeholderTextColor={palette.textMuted}
                style={styles.nameInput}
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
                <Text style={styles.levelText}>
                  {tr(messages, levelLabelKey(profile?.profileLevel))}
                </Text>
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
    itemLabel: { ...TYPE.bodyStrong, color: palette.text, flex: 1, fontSize: 18 },
    nameInput: {
      minHeight: 52,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      paddingHorizontal: SPACING.md,
      color: palette.text,
      fontSize: 16,
      fontWeight: "700",
    },
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
