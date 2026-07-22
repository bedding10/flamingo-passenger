import React from "react";
import { Linking, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Loading, Message, PrimaryButton, Row, Screen, money, ui } from "../../components/PassengerScreen";
import { tr } from "../../core/i18n";
import { passengerServicesApi, type PassengerPaymentMethod } from "../../core/passenger-api";
import { useMessages } from "../../core/use-messages";
import type { RootStackParamList } from "../../navigation/types";

export function TripPaymentScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "TripPayment">) {
  const { messages } = useMessages();
  const client = useQueryClient();
  const methods = useQuery({ queryKey: ["passenger-payment-methods"], queryFn: passengerServicesApi.paymentMethods });
  const payment = useQuery({ queryKey: ["trip-payment", route.params.tripId], queryFn: () => passengerServicesApi.tripPayment(route.params.tripId) });
  const checkout = useMutation({ mutationFn: (method: PassengerPaymentMethod["method"]) => passengerServicesApi.checkoutTrip(route.params.tripId, method), onSuccess: async (result) => { await Promise.all([client.invalidateQueries({ queryKey: ["trip-payment", route.params.tripId] }), client.invalidateQueries({ queryKey: ["wallet"] })]); if (result.checkout.checkoutUrl) await Linking.openURL(result.checkout.checkoutUrl); } });
  return <Screen title={tr(messages, "payment.title")} onBack={navigation.goBack}>{methods.isPending || payment.isPending ? <Loading /> : methods.isError || payment.isError ? <Message danger>{tr(messages, "common.error")}</Message> : <>
    {payment.data ? <Card><Text style={ui.h2}>{tr(messages, "payment.current")}</Text><Row title={tr(messages, "payment.method")} value={tr(messages, `payment.method.${payment.data.method}`)} /><Row title={tr(messages, "payment.status")} value={tr(messages, `payment.status.${payment.data.status}`)} /><Row title={tr(messages, "payment.amount")} value={money(payment.data.amount)} /></Card> : null}
    <Text style={ui.section}>{tr(messages, "payment.methods")}</Text>
    {(methods.data ?? []).map(item => <Card key={`${item.method}:${item.provider ?? ""}`}><Row title={tr(messages, item.labelKey)} subtitle={item.provider} /><PrimaryButton label={tr(messages, "payment.useMethod")} disabled={checkout.isPending || payment.data?.status === "PAID"} onPress={() => checkout.mutate(item.method)} /></Card>)}
    {!methods.data?.length ? <Message>{tr(messages, "payment.none")}</Message> : null}{checkout.isError ? <Message danger>{tr(messages, "common.error")}</Message> : null}
  </>}</Screen>;
}
