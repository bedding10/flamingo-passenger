import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen, Loading, Message, ui } from "../../components/PassengerScreen";
import { tr } from "../../core/i18n";
import { passengerServicesApi, type MenuRoute } from "../../core/passenger-api";
import { useSession } from "../../core/session-store";
import { useMessages } from "../../core/use-messages";
import type { RootStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Menu">;
export function MenuScreen({ navigation }: Props) {
  const profile = useSession((state) => state.profile);
  const logout = useSession((state) => state.logout);
  const { messages } = useMessages();
  const config = useQuery({ queryKey: ["passenger-config"], queryFn: passengerServicesApi.config, staleTime: 60_000 });
  const items = config.data?.settings["passenger.navigation"]?.items.filter((item) => item.enabled) ?? [];
  return <Screen title={tr(messages, "menu.title")} onBack={navigation.goBack}>
    <Animated.View entering={FadeInDown.springify().damping(19)} style={ui.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        {profile?.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={{ width: 62, height: 62, borderRadius: 31 }} /> : null}
        <View style={{ flex: 1 }}><Text style={ui.h2}>{profile?.name}</Text><Text style={ui.caption}>{profile?.phone}</Text></View>
      </View>
    </Animated.View>
    {config.isPending ? <Loading /> : config.isError ? <Message danger>{tr(messages, "common.error")}</Message> : <View style={ui.card}>
      {items.map((item) => <Pressable key={item.route} onPress={() => navigation.navigate(item.route as MenuRoute & keyof RootStackParamList)} style={ui.row}><Text style={ui.rowTitle}>{tr(messages, item.labelKey)}</Text><Text style={ui.chevron}>›</Text></Pressable>)}
    </View>}
    <Pressable onPress={() => void logout()} style={ui.secondary}><Text style={ui.dangerText}>{tr(messages, "menu.logout")}</Text></Pressable>
  </Screen>;
}
