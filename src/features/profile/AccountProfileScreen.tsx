import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Mail, Phone, Route as RouteIcon, Star } from "lucide-react-native";
import { Screen, useUi } from "../../components/PassengerScreen";
import { GoldButton } from "../../components/GoldButton";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { a11yValue } from "../../core/a11y";
import { tr } from "../../core/i18n";
import { passengerServicesApi } from "../../core/passenger-api";
import { useSession } from "../../core/session-store";
import { useMessages } from "../../core/use-messages";
import { useTheme } from "../../core/theme-store";
import { withAlpha, type Palette } from "../../core/theme";
import { RADIUS, SHADOW, SPACING, TYPE } from "../../core/design";
import type { RootStackParamList } from "../../navigation/types";

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

export function AccountProfileScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Profile">) {
  const { messages } = useMessages();
  const ui = useUi();
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const profile = useSession((state) => state.profile);
  const restore = useSession((state) => state.restore);
  const [name, setName] = useState(profile?.name ?? "");

  const save = useMutation({
    mutationFn: () => passengerServicesApi.updateProfile({ name: name.trim() }),
    onSuccess: () => restore(),
  });

  // Phase 11: completed trips only, straight from the server.
  const trips = profile?.completedTripsCount ?? profile?.tripCount ?? 0;
  const rating = profile?.rating;
  const initial = (profile?.name ?? "").trim().charAt(0).toUpperCase();
  const dirty = name.trim().length > 0 && name.trim() !== (profile?.name ?? "");

  return (
    <Screen title={tr(messages, "profile.title")} onBack={navigation.goBack}>
      <Animated.View entering={FadeInDown.duration(260)} style={styles.hero}>
        <ProfileAvatar
          avatarUrl={profile?.avatarUrl}
          frameUrl={profile?.profileFrameUrl}
          size={104}
          fallback={initial}
          textColor={palette.accent}
        />
        <Text style={styles.name}>{profile?.name ?? ""}</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>
            {tr(messages, levelLabelKey(profile?.profileLevel))}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.statsRow}>
        <View style={styles.stat} {...a11yValue(tr(messages, "trips.total"), trips)}>
          <RouteIcon size={18} color={palette.text} strokeWidth={2.2} />
          <Text style={styles.statValue}>{trips}</Text>
          <Text style={styles.statLabel}>{tr(messages, "trips.total")}</Text>
        </View>
        <View
          style={styles.stat}
          {...a11yValue(tr(messages, "trips.driver"), rating == null ? "" : rating)}
        >
          <Star size={18} color={palette.accent} strokeWidth={2.4} />
          <Text style={styles.statValue}>{rating == null ? "\u2013" : rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>
            {profile?.ratingCount ? `(${profile.ratingCount})` : "\u2605"}
          </Text>
        </View>
        <View style={styles.stat} {...a11yValue(tr(messages, "settings.language"), profile?.locale)}>
          <Text style={styles.statValue}>{(profile?.locale ?? "").toUpperCase()}</Text>
          <Text style={styles.statLabel}>{tr(messages, "settings.language")}</Text>
        </View>
      </View>

      {/* Phase 11 - level progress. Values come from the server; the screen
          only formats them, and the block hides itself at the top level. */}
      {profile?.profileLevel ? (
        <View style={styles.levelCard}>
          <View style={styles.levelRow}>
            <Text style={styles.levelRowLabel}>
              {tr(messages, "profile.level")}
            </Text>
            <Text style={styles.levelRowValue}>
              {tr(messages, levelLabelKey(profile.profileLevel))}
            </Text>
          </View>
          <View style={styles.levelRow}>
            <Text style={styles.levelRowLabel}>
              {tr(messages, "profile.completedTrips")}
            </Text>
            <Text style={styles.levelRowValue}>{trips}</Text>
          </View>
          {profile.nextLevel && profile.nextLevelAt ? (
            <>
              <View style={styles.levelRow}>
                <Text style={styles.levelRowLabel}>
                  {tr(messages, "profile.progress")}
                </Text>
                <Text style={styles.levelRowValue}>
                  {trips} / {profile.nextLevelAt}
                </Text>
              </View>
              <View style={styles.levelRow}>
                <Text style={styles.levelRowLabel}>
                  {tr(messages, "profile.nextLevel")}
                </Text>
                <Text style={styles.levelRowValue}>
                  {tr(messages, levelLabelKey(profile.nextLevel))}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      <Text style={ui.section}>{tr(messages, "profile.name")}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={tr(messages, "profile.name")}
        placeholderTextColor={palette.textMuted}
        accessibilityLabel={tr(messages, "profile.name")}
        style={styles.nameInput}
      />

      <View style={styles.contactCard}>
        <View style={styles.contactRow} {...a11yValue(tr(messages, "profile.phone"), profile?.phone)}>
          <Phone size={18} color={palette.textMuted} strokeWidth={2.2} />
          <Text style={styles.contactLabel}>{tr(messages, "profile.phone")}</Text>
          <Text style={styles.contactValue}>{profile?.phone ?? ""}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.contactRow} {...a11yValue(tr(messages, "profile.email"), profile?.email)}>
          <Mail size={18} color={palette.textMuted} strokeWidth={2.2} />
          <Text style={styles.contactLabel}>{tr(messages, "profile.email")}</Text>
          <Text style={styles.contactValue}>{profile?.email ?? "\u2013"}</Text>
        </View>
      </View>

      {save.isError ? (
        <Text style={ui.dangerText}>{tr(messages, "common.error")}</Text>
      ) : null}

      <GoldButton
        label={tr(messages, "common.save")}
        disabled={!dirty}
        loading={save.isPending}
        onPress={() => save.mutate()}
      />
    </Screen>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    hero: { alignItems: "center", gap: SPACING.sm, paddingVertical: SPACING.lg },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: RADIUS.pill,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: palette.surfaceAlt,
      borderWidth: 2,
      borderColor: withAlpha(palette.accent, 0.5),
      ...SHADOW.card,
    },
    avatarImage: { width: "100%", height: "100%" },
    avatarLetter: { ...TYPE.display, color: palette.text },
    name: { ...TYPE.title, color: palette.text },
    levelBadge: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: withAlpha(palette.accent, 0.16),
    },
    levelText: { ...TYPE.overline, color: palette.accent },
    statsRow: { flexDirection: "row", gap: SPACING.sm },
    // Phase 11 - level progress card, styled like the existing stat cards.
    levelCard: {
      gap: SPACING.xs,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    levelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    levelRowLabel: { ...TYPE.caption, color: palette.textMuted },
    levelRowValue: { ...TYPE.body, color: palette.text },
    stat: {
      flex: 1,
      alignItems: "center",
      gap: 2,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    statValue: { ...TYPE.heading, color: palette.text },
    statLabel: { ...TYPE.caption, color: palette.textMuted },
    nameInput: {
      minHeight: 58,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      color: palette.text,
      paddingHorizontal: SPACING.lg,
      ...TYPE.body,
    },
    contactCard: {
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      paddingHorizontal: SPACING.lg,
      ...SHADOW.card,
    },
    contactRow: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
    },
    contactLabel: { ...TYPE.caption, color: palette.textMuted, flex: 1 },
    contactValue: { ...TYPE.bodyStrong, color: palette.text },
    divider: { height: 1, backgroundColor: palette.border },
  });
}
