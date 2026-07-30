import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useMutation } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { passengerServicesApi } from "../../core/passenger-api";
import { useSession } from "../../core/session-store";
import { useTheme } from "../../core/theme-store";
import { useMessages } from "../../core/use-messages";
import { tr } from "../../core/i18n";
import type { RootStackParamList } from "../../navigation/types";
import {
  Card,
  LabeledInput,
  MenuScaffold,
  PrimaryAction,
  StatusMessage,
} from "../../components/menu/MenuScaffold";
import { HelpHub } from "../../components/HelpHub";
import { SendIcon } from "../../components/icons/Icons";
import { colors, iconSize, spacing, typography } from "../../design/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Support">;

export function HelpScreen({ navigation }: Props) {
  const { palette } = useTheme();
  const { messages } = useMessages();
  const profile = useSession((state) => state.profile);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [message, setMessage] = useState("");

  const send = useMutation({
    mutationFn: () =>
      passengerServicesApi.createTicket(
        tr(messages, "help.ticketSubject"),
        `${message.trim()}\n\n${tr(messages, "help.phoneLine")} ${phone.trim()}`,
      ),
    onSuccess: () => setMessage(""),
  });

  const ready = message.trim().length > 4 && phone.trim().length > 5;

  return (
    <MenuScaffold
      title={tr(messages, "help.title")}
      subtitle={tr(messages, "help.subtitle")}
      onBack={() => navigation.goBack()}
    >
      <HelpHub
        messages={messages}
        onOpenTrip={(tripId) => navigation.navigate("TripDetails", { tripId })}
        onLiveChat={(tripId) => navigation.navigate("TripCommunication", { tripId })}
      />

      <Card>
        <Text style={[styles.blurb, { color: palette.textMuted }]}>
          {tr(messages, "help.blurb")}
        </Text>
      </Card>

      <LabeledInput
        label={tr(messages, "help.phone")}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+213..."
      />

      <LabeledInput
        label={tr(messages, "help.problem")}
        value={message}
        onChangeText={setMessage}
        placeholder={tr(messages, "help.placeholder")}
        area
      />

      {send.isError ? (
        <StatusMessage danger>{tr(messages, "help.sendError")}</StatusMessage>
      ) : null}
      {send.isSuccess ? (
        <StatusMessage>{tr(messages, "help.sendSuccess")}</StatusMessage>
      ) : null}

      <PrimaryAction
        label={tr(messages, "common.send")}
        onPress={() => send.mutate()}
        disabled={!ready}
        loading={send.isPending}
        leading={<SendIcon size={iconSize.md} color={colors.black} />}
      />
    </MenuScaffold>
  );
}

const styles = StyleSheet.create({
  blurb: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
});

export default HelpScreen;
