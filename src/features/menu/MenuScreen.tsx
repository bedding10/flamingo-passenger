import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen, Loading, Message, useUi } from "../../components/PassengerScreen";
import { tr } from "../../core/i18n";
import type { Locale } from "../../core/contracts";
import { SUPPORTED_LOCALES, useLocaleStore } from "../../core/locale-store";
import { passengerServicesApi, type MenuRoute } from "../../core/passenger-api";
import { useSession } from "../../core/session-store";
import { useMessages } from "../../core/use-messages";
import { useTheme } from "../../core/theme-store";
import type { ThemeMode } from "../../core/theme";
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
  { key: "support", labelKey: "menu.group.support", routes: ["Support", "Contact", "About", "Legal"] },
];
const THEME_MODES: ThemeMode[] = ["light", "dark", "system"];
const THEME_LABEL: Record<ThemeMode, string> = {
  light: "theme.light",
  dark: "theme.dark",
  system: "theme.system",
};

type Props = NativeStackScreenProps<RootStackParamList, "Menu">;
export function MenuScreen({ navigation }: Props) {
  const ui = useUi();
  const { palette, mode, setMode } = useTheme();
  const profile = useSession((state) => state.profile);
  const logout = useSession((state) => state.logout);
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const { messages } = useMessages();
  const config = useQuery({ queryKey: ["passenger-config"], queryFn: passengerServicesApi.config, staleTime: 60_000 });
  const items = config.data?.settings["passenger.navigation"]?.items.filter((item) => item.enabled) ?? [];
  const grouped = GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => group.routes.includes(item.route)),
  })).filter((group) => group.items.length > 0);
  const ungrouped = items.filter(
    (item) =>
      !GROUPS.some((group) => group.routes.includes(item.route)) &&
      item.route !== "Settings",
  );

  return <Screen title={tr(messages, "menu.title")} onBack={navigation.goBack}>
    <Animated.View entering={FadeInDown.springify().damping(19)} style={ui.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: palette.onPrimary, fontSize: 24, fontWeight: "900" }}>{(profile?.name ?? "?").trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ui.h2}>{profile?.name}</Text>
          <Text style={ui.caption}>{profile?.phone}</Text>
        </View>
      </View>
    </Animated.View>

    {config.isPending ? <Loading /> : config.isError ? <Message danger>{tr(messages, "common.error")}</Message> : <>
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

    {/* Local settings section: language (flags) + theme (light/dark/auto). */}
    <Text style={ui.section}>{tr(messages, "menu.group.settings")}</Text>
    <View style={ui.card}>
      <Text style={ui.fieldLabel}>{tr(messages, "settings.language")}</Text>
      <View style={ui.chipRow}>
        {SUPPORTED_LOCALES.map((value) => <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={`language: ${value}`}
          onPress={() => void setLocale(value)}
          style={[{ width: 52, height: 52, borderRadius: 26, borderWidth: value === locale ? 2 : 1, borderColor: value === locale ? palette.primary : palette.border, backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" }]}
        >
          <Image source={FLAGS[value]} style={{ width: 34, height: 34, borderRadius: 17 }} />
        </Pressable>)}
      </View>
      <View style={ui.divider} />
      <Text style={ui.fieldLabel}>{tr(messages, "theme.title")}</Text>
      <View style={ui.chipRow}>
        {THEME_MODES.map((value) => <Pressable key={value} onPress={() => setMode(value)} style={[ui.chip, mode === value && ui.chipActive]}>
          <Text style={[ui.chipText, mode === value && ui.chipTextActive]}>{tr(messages, THEME_LABEL[value])}</Text>
        </Pressable>)}
      </View>
    </View>

    <Pressable onPress={() => void logout()} style={ui.secondary}>
      <Text style={ui.dangerText}>{tr(messages, "menu.logout")}</Text>
    </Pressable>
  </Screen>;
}
