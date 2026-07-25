import React, { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen, Loading, Message, useUi } from "../../components/PassengerScreen";
import { tr } from "../../core/i18n";
import type { Locale } from "../../core/contracts";
import { SUPPORTED_LOCALES, useLocaleStore } from "../../core/locale-store";
import { passengerServicesApi, type MenuRoute } from "../../core/passenger-api";
import { useSession } from "../../core/session-store";
import { useMessages } from "../../core/use-messages";
import { nextMode, useTheme } from "../../core/theme-store";
import type { RootStackParamList } from "../../navigation/types";

// Flag icons for the in-app language switcher (icons only, no labels), same as
// the auth screen so the language stays switchable after login too.
const FLAGS: Record<Locale, number> = {
  ar: require("../../../assets/flag-ar.png") as number,
  fr: require("../../../assets/flag-fr.png") as number,
  en: require("../../../assets/flag-en.png") as number,
};

// Ordered menu groups. Server-driven items (passenger.navigation) are sorted
// into these groups; the settings section is local.
const GROUPS: { key: string; labelKey: string; routes: MenuRoute[] }[] = [
  { key: "account", labelKey: "menu.group.account", routes: ["Profile", "DeleteAccount"] },
  { key: "trips", labelKey: "menu.group.trips", routes: ["Trips", "Places"] },
  { key: "payments", labelKey: "menu.group.payments", routes: ["Wallet", "Coupons", "Referrals", "Subscriptions"] },
  { key: "notifications", labelKey: "menu.group.notifications", routes: ["Notifications"] },
  { key: "help", labelKey: "menu.group.help", routes: ["Support", "Contact", "About", "Legal"] },
];

// Wallet, coupons and help must always be reachable even if the dashboard
// navigation payload has not been configured yet. Server items win; these only
// fill the gaps, so removing an item server-side still hides it everywhere but
// for these three pillars of the account.
const PILLARS: { route: MenuRoute; labelKey: string }[] = [
  { route: "Wallet", labelKey: "wallet.title" },
  { route: "Coupons", labelKey: "coupons.title" },
  { route: "Support", labelKey: "support.title" },
];

// Theme is a single icon button now (no labels, no automatic mode).
const THEME_ICON: Record<string, string> = { light: "\u25D0", dark: "\u25D1" };

type Props = NativeStackScreenProps<RootStackParamList, "Menu">;
export function MenuScreen({ navigation }: Props) {
  const ui = useUi();
  const { palette, name: themeName, setMode } = useTheme();
  const profile = useSession((state) => state.profile);
  const restore = useSession((state) => state.restore);
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
  const config = useQuery({ queryKey: ["passenger-config"], queryFn: passengerServicesApi.config, staleTime: 60_000 });
  const serverItems = config.data?.settings["passenger.navigation"]?.items.filter((item) => item.enabled) ?? [];
  const items = [
    ...serverItems,
    ...PILLARS.filter((pillar) => !serverItems.some((item) => item.route === pillar.route)).map((pillar) => ({
      route: pillar.route,
      labelKey: pillar.labelKey,
      enabled: true,
    })),
  ];
  const grouped = GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => group.routes.includes(item.route)),
  })).filter((group) => group.items.length > 0);
  const ungrouped = items.filter(
    (item) =>
      !GROUPS.some((group) => group.routes.includes(item.route)) &&
      item.route !== "Settings",
  );
  const trips = profile?.tripCount ?? 0;
  const rating = profile?.rating;

  return <Screen title={tr(messages, "menu.title")} onBack={navigation.goBack}>
    <Animated.View entering={FadeInDown.springify().damping(19)} style={ui.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: palette.onPrimary, fontSize: 24, fontWeight: "900" }}>{(profile?.name ?? "?").trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text numberOfLines={1} style={[ui.h2, { flexShrink: 1 }]}>{profile?.name}</Text>
              {/* Star rating next to the name, trip count in parentheses. */}
              <Text style={{ color: palette.accent, fontSize: 14, fontWeight: "800" }}>
                {"\u2605"} {rating != null ? rating.toFixed(1) : "\u2013"}
              </Text>
              <Text style={ui.caption}>({trips})</Text>
            </View>
          )}
          <Text style={ui.caption}>{profile?.phone}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr(messages, "menu.editName")}
          disabled={saveName.isPending}
          onPress={() => (editing ? name.trim() && saveName.mutate() : setEditing(true))}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: palette.text, fontSize: 17, fontWeight: "800" }}>{editing ? "\u2713" : "\u270E"}</Text>
        </Pressable>
      </View>
      {saveName.isError ? <Message danger>{tr(messages, "common.error")}</Message> : null}
    </Animated.View>

    {config.isPending ? <Loading /> : <>
      {grouped.map((group) => <View key={group.key} style={{ gap: 6 }}>
        <Text style={ui.section}>{tr(messages, group.labelKey)}</Text>
        <View style={ui.card}>
          {group.items.map((item) => <Pressable key={item.route} onPress={() => navigation.navigate(item.route as MenuRoute & keyof RootStackParamList)} style={ui.row}>
            <Text style={[ui.rowTitle, { flex: 1 }]}>{tr(messages, item.labelKey)}</Text>
            <Text style={ui.chevron}>{"\u203a"}</Text>
          </Pressable>)}
        </View>
      </View>)}
      {ungrouped.length ? <View style={ui.card}>
        {ungrouped.map((item) => <Pressable key={item.route} onPress={() => navigation.navigate(item.route as MenuRoute & keyof RootStackParamList)} style={ui.row}>
          <Text style={[ui.rowTitle, { flex: 1 }]}>{tr(messages, item.labelKey)}</Text>
          <Text style={ui.chevron}>{"\u203a"}</Text>
        </Pressable>)}
      </View> : null}
    </>}

    {/* Local settings: language (flags) + theme (single icon button). */}
    <Text style={ui.section}>{tr(messages, "menu.group.settings")}</Text>
    <View style={ui.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={ui.fieldLabel}>{tr(messages, "settings.language")}</Text>
          <View style={ui.chipRow}>
            {SUPPORTED_LOCALES.map((value) => <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`language: ${value}`}
              onPress={() => void setLocale(value)}
              style={{ width: 52, height: 52, borderRadius: 26, borderWidth: value === locale ? 2 : 1, borderColor: value === locale ? palette.primary : palette.border, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" }}
            >
              <Image source={FLAGS[value]} style={{ width: 34, height: 34, borderRadius: 17 }} />
            </Pressable>)}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr(messages, "theme.title")}
          onPress={() => setMode(nextMode(themeName))}
          style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: palette.text, fontSize: 22, fontWeight: "800" }}>{THEME_ICON[themeName]}</Text>
        </Pressable>
      </View>
    </View>
  </Screen>;
}
