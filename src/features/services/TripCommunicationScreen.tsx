import React, { useState } from "react";
import { Linking } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Field, Loading, Message, PrimaryButton, Row, Screen, SecondaryButton, day } from "../../components/PassengerScreen";
import { tr } from "../../core/i18n";
import { passengerServicesApi } from "../../core/passenger-api";
import { useMessages } from "../../core/use-messages";
import type { RootStackParamList } from "../../navigation/types";

export function TripCommunicationScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "TripCommunication">) {
  const { locale, messages } = useMessages();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const context = useQuery({ queryKey: ["trip-communication", route.params.tripId], queryFn: () => passengerServicesApi.tripCommunication(route.params.tripId), refetchInterval: (query) => (query.state.data?.active ? 10000 : false) });
  const chat = useQuery({ queryKey: ["trip-messages", route.params.tripId], queryFn: () => passengerServicesApi.tripMessages(route.params.tripId), enabled: !!context.data, refetchInterval: context.data?.canChat ? 5000 : false });
  const send = useMutation({ mutationFn: () => passengerServicesApi.sendTripMessage(route.params.tripId, body.trim()), onSuccess: async () => { setBody(""); await client.invalidateQueries({ queryKey: ["trip-messages", route.params.tripId] }); } });
  const call = async () => { const phone = context.data?.phoneNumber; if (phone) await Linking.openURL(`tel:${phone}`); };
  return <Screen title={tr(messages, "communication.title")} onBack={navigation.goBack}>{context.isPending ? <Loading /> : context.isError || !context.data ? <Message danger>{tr(messages, "common.error")}</Message> : <>
    <Card><Row title={context.data.participant.name ?? tr(messages, "communication.participant")} subtitle={tr(messages, context.data.active ? "communication.active" : "communication.inactive")} />{context.data.canCall ? <PrimaryButton label={tr(messages, "communication.call")} onPress={() => void call()} /> : null}</Card>
    {chat.isPending ? <Loading /> : chat.isError ? <Message danger>{tr(messages, "common.error")}</Message> : chat.data?.items.length ? chat.data.items.map(item => <Card key={item.id}><Row title={item.body} subtitle={day(item.createdAt, locale)} /></Card>) : <Message>{tr(messages, "communication.empty")}</Message>}
    {context.data.canChat ? <><Field value={body} onChangeText={setBody} multiline label={tr(messages, "communication.message")} /><PrimaryButton label={tr(messages, "communication.send")} disabled={!body.trim() || send.isPending} onPress={() => send.mutate()} /></> : <SecondaryButton label={tr(messages, "communication.closed")} disabled onPress={() => undefined} />}
    {send.isError ? <Message danger>{tr(messages, "common.error")}</Message> : null}
  </>}</Screen>;
}
