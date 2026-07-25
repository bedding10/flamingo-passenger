import React from "react";
import { Linking, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Loading, Message, PrimaryButton, Screen, SecondaryButton, day, useUi } from "../../components/PassengerScreen";
import { tr } from "../../core/i18n";
import { passengerServicesApi, type NotificationItem } from "../../core/passenger-api";
import { useMessages } from "../../core/use-messages";
import type { RootStackParamList } from "../../navigation/types";

export function NotificationsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Notifications">) {
  const { locale, messages } = useMessages(), ui = useUi();
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["notifications"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => passengerServicesApi.notifications(pageParam),
    getNextPageParam: (last) => last.page * last.limit < last.total ? last.page + 1 : undefined,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["notifications"] });
  const mark = useMutation({ mutationFn: ({ id, read }: { id: string; read: boolean }) => passengerServicesApi.markNotification(id, read), onSuccess: refresh });
  const remove = useMutation({ mutationFn: passengerServicesApi.deleteNotification, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: passengerServicesApi.markAllNotifications, onSuccess: refresh });
  const removeAll = useMutation({ mutationFn: passengerServicesApi.deleteAllNotifications, onSuccess: refresh });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  async function open(item: NotificationItem) {
    if (!item.isRead) await passengerServicesApi.markNotification(item.id, true);
    await refresh();
    if (item.deepLink && await Linking.canOpenURL(item.deepLink)) await Linking.openURL(item.deepLink);
  }
  return <Screen title={tr(messages, "notifications.title")} onBack={navigation.goBack} scroll={false}><View style={{ flex: 1, padding: 16, gap: 10 }}>
    <View style={ui.chipRow}><SecondaryButton label={tr(messages, "notifications.readAll")} disabled={!items.length || markAll.isPending} onPress={() => markAll.mutate()} /><PrimaryButton destructive label={tr(messages, "notifications.deleteAll")} disabled={!items.length || removeAll.isPending} onPress={() => removeAll.mutate()} /></View>
    {query.isPending ? <Loading /> : query.isError ? <><Message danger>{tr(messages, "common.error")}</Message><SecondaryButton label={tr(messages, "common.retry")} onPress={() => void query.refetch()} /></> : <FlashList data={items} estimatedItemSize={156} onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && void query.fetchNextPage()} ListEmptyComponent={<Message>{tr(messages, "notifications.empty")}</Message>} ListFooterComponent={query.isFetchingNextPage ? <Loading /> : null} renderItem={({ item }) => <Card onPress={() => void open(item)}><Text style={ui.h2}>{item.title}</Text><Text style={ui.paragraph}>{item.body}</Text>{!item.isRead ? <Text style={ui.success}>{tr(messages, "notifications.unread")}</Text> : null}<Text style={ui.caption}>{day(item.sentAt ?? item.createdAt, locale)}</Text><View style={ui.chipRow}><SecondaryButton label={tr(messages, item.isRead ? "notifications.markUnread" : "notifications.markRead")} disabled={mark.isPending} onPress={() => mark.mutate({ id: item.id, read: !item.isRead })} /><PrimaryButton destructive label={tr(messages, "common.delete")} disabled={remove.isPending} onPress={() => remove.mutate(item.id)} /></View></Card>} />}
  </View></Screen>;
}
