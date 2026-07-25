import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loading, Message, Screen, day } from "../../components/PassengerScreen";
import { tr } from "../../core/i18n";
import { passengerServicesApi } from "../../core/passenger-api";
import { useSession } from "../../core/session-store";
import type { Palette } from "../../core/theme";
import { useTheme } from "../../core/theme-store";
import { useMessages } from "../../core/use-messages";
import { connectTripChat } from "../trip/realtime";
import type { RootStackParamList } from "../../navigation/types";

// Canned replies, exactly like the quick phrases in Uber / inDrive chats.
const QUICK_KEYS = [
  "communication.quick.onMyWay",
  "communication.quick.waiting",
  "communication.quick.whereAreYou",
  "communication.quick.twoMinutes",
  "communication.quick.thanks",
];

export function TripCommunicationScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "TripCommunication">) {
  const { locale, messages } = useMessages();
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const profile = useSession((state) => state.profile);
  const client = useQueryClient();
  const listRef = useRef<ScrollView>(null);
  const [body, setBody] = useState("");
  const tripId = route.params.tripId;

  const context = useQuery({
    queryKey: ["trip-communication", tripId],
    queryFn: () => passengerServicesApi.tripCommunication(tripId),
    refetchInterval: (query) => (query.state.data?.active ? 10000 : false),
  });
  const chat = useQuery({
    queryKey: ["trip-messages", tripId],
    queryFn: () => passengerServicesApi.tripMessages(tripId),
    enabled: !!context.data,
    // The socket delivers messages instantly; this slow poll is only a
    // safety net for a dropped connection.
    refetchInterval: context.data?.canChat ? 15000 : false,
  });
  const send = useMutation({
    mutationFn: (text: string) =>
      passengerServicesApi.sendTripMessage(tripId, text.trim()),
    onSuccess: async () => {
      setBody("");
      await client.invalidateQueries({ queryKey: ["trip-messages", tripId] });
      listRef.current?.scrollToEnd({ animated: true });
    },
  });

  // Instant delivery: the server broadcasts "trip:message" to the trip room.
  useEffect(() => {
    if (context.data?.canChat !== true) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void connectTripChat(tripId, () => {
      void client.invalidateQueries({ queryKey: ["trip-messages", tripId] });
    }).then((close) => {
      if (cancelled) close();
      else dispose = close;
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [client, context.data?.canChat, tripId]);

  const call = async () => {
    const phone = context.data?.phoneNumber;
    if (phone) await Linking.openURL(`tel:${phone}`);
  };

  const items = chat.data?.items ?? [];
  const canChat = context.data?.canChat === true;

  return (
    <Screen
      title={tr(messages, "communication.title")}
      onBack={navigation.goBack}
      scroll={false}
    >
      {context.isPending ? (
        <Loading />
      ) : context.isError || !context.data ? (
        <Message danger>{tr(messages, "common.error")}</Message>
      ) : (
        <View style={styles.flex}>
          {/* driver header + direct call button */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(context.data.participant.name ?? "?").trim().charAt(0)}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.name}>
                {context.data.participant.name ??
                  tr(messages, "communication.participant")}
              </Text>
              <Text style={styles.muted}>
                {tr(
                  messages,
                  context.data.active
                    ? "communication.active"
                    : "communication.inactive",
                )}
              </Text>
            </View>
            {context.data.canCall ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr(messages, "communication.call")}
                onPress={() => void call()}
                style={styles.callButton}
              >
                <Text style={styles.callIcon}>{"\u2706"}</Text>
              </Pressable>
            ) : null}
          </View>

          {/* conversation */}
          <ScrollView
            ref={listRef}
            style={styles.flex}
            contentContainerStyle={styles.thread}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
          >
            {chat.isPending ? (
              <Loading />
            ) : chat.isError ? (
              <Message danger>{tr(messages, "common.error")}</Message>
            ) : items.length ? (
              items.map((item) => {
                const mine = item.senderId === profile?.id;
                return (
                  <View
                    key={item.id}
                    style={[styles.bubble, mine ? styles.mine : styles.theirs]}
                  >
                    <Text style={mine ? styles.mineText : styles.theirsText}>
                      {item.body}
                    </Text>
                    <Text style={mine ? styles.mineTime : styles.theirsTime}>
                      {day(item.createdAt, locale)}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.muted}>
                {tr(messages, "communication.empty")}
              </Text>
            )}
          </ScrollView>

          {canChat ? (
            <View>
              {/* quick replies */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickRow}
              >
                {QUICK_KEYS.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => send.mutate(tr(messages, key))}
                    disabled={send.isPending}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>{tr(messages, key)}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* composer */}
              <View style={styles.composer}>
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  placeholder={tr(messages, "communication.message")}
                  placeholderTextColor={palette.textMuted}
                  multiline
                  maxLength={1000}
                  style={styles.input}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr(messages, "communication.send")}
                  onPress={() => send.mutate(body)}
                  disabled={!body.trim() || send.isPending}
                  style={[
                    styles.sendButton,
                    (!body.trim() || send.isPending) && styles.disabled,
                  ]}
                >
                  <Text style={styles.sendIcon}>{"\u27A4"}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={[styles.muted, styles.closed]}>
              {tr(messages, "communication.closed")}
            </Text>
          )}
          {send.isError ? (
            <Message danger>{tr(messages, "common.error")}</Message>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    flex: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: palette.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 18, fontWeight: "800", color: palette.text },
    name: { fontSize: 16, fontWeight: "700", color: palette.text },
    muted: { fontSize: 13, color: palette.textMuted },
    callButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    callIcon: { fontSize: 20, color: palette.onPrimary },
    thread: { paddingVertical: 16, gap: 10 },
    bubble: { maxWidth: "82%", borderRadius: 18, padding: 12 },
    mine: { alignSelf: "flex-end", backgroundColor: palette.primary },
    theirs: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
    },
    mineText: { fontSize: 15, color: palette.onPrimary, lineHeight: 21 },
    theirsText: { fontSize: 15, color: palette.text, lineHeight: 21 },
    mineTime: { fontSize: 11, color: palette.onPrimary, opacity: 0.7, marginTop: 4 },
    theirsTime: { fontSize: 11, color: palette.textMuted, marginTop: 4 },
    quickRow: { gap: 8, paddingVertical: 10 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
    },
    chipText: { fontSize: 13, color: palette.text },
    composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingBottom: 12 },
    input: {
      flex: 1,
      maxHeight: 120,
      minHeight: 48,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingTop: 13,
      paddingBottom: 10,
      fontSize: 15,
      color: palette.text,
      backgroundColor: palette.surface,
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sendIcon: { fontSize: 18, color: palette.onPrimary },
    disabled: { opacity: 0.35 },
    closed: { paddingVertical: 16, textAlign: "center" },
  });
}
