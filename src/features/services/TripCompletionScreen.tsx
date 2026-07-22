import React, { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, Field, Loading, Message, PrimaryButton, Screen, SecondaryButton, ui } from "../../components/PassengerScreen";
import { tr } from "../../core/i18n";
import { passengerServicesApi } from "../../core/passenger-api";
import { useMessages } from "../../core/use-messages";
import type { RootStackParamList } from "../../navigation/types";

export function TripCompletionScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "TripCompletion">) {
  const { messages } = useMessages();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [report, setReport] = useState("");
  const trip = useQuery({ queryKey: ["passenger-trip", route.params.tripId], queryFn: () => passengerServicesApi.trip(route.params.tripId) });
  const rating = useMutation({ mutationFn: () => passengerServicesApi.rateTrip(route.params.tripId, stars, comment.trim() || undefined) });
  const complaint = useMutation({ mutationFn: () => passengerServicesApi.reportTrip(route.params.tripId, report.trim()) });
  const share = async () => {
    if (!trip.data) return;
    const text = [tr(messages, "tripShare.title"), `${tr(messages, "home.pickup")}: ${trip.data.pickupAddress ?? ""}`, `${tr(messages, "home.destination")}: ${trip.data.destAddress ?? ""}`, `${tr(messages, "tripShare.reference")}: ${trip.data.id}`].join("\n");
    await Share.share({ message: text });
  };
  return <Screen title={tr(messages, "trip.actions")} onBack={navigation.goBack}>{trip.isPending ? <Loading /> : trip.isError || !trip.data ? <Message danger>{tr(messages, "common.error")}</Message> : <>
    <Card><PrimaryButton label={tr(messages, "tripShare.button")} onPress={() => void share()} /><SecondaryButton label={tr(messages, "communication.title")} onPress={() => navigation.navigate("TripCommunication", { tripId: trip.data!.id })} /><SecondaryButton label={tr(messages, "payment.title")} onPress={() => navigation.navigate("TripPayment", { tripId: trip.data!.id })} /></Card>
    {trip.data.status === "COMPLETED" && trip.data.driver ? <Card><Text style={ui.h2}>{tr(messages, "rating.title")}</Text><View style={ui.chipRow}>{[1,2,3,4,5].map(value => <Pressable accessibilityRole="button" accessibilityLabel={`${tr(messages, "rating.stars")} ${value}`} key={value} onPress={() => setStars(value)} style={[ui.chip, stars === value && ui.chipActive]}><Text style={[ui.chipText, stars === value && ui.chipTextActive]}>{value}</Text></Pressable>)}</View><Field value={comment} onChangeText={setComment} multiline label={tr(messages, "rating.comment")} /><PrimaryButton label={tr(messages, "rating.submit")} disabled={stars < 1 || rating.isPending || rating.isSuccess} onPress={() => rating.mutate()} />{rating.isSuccess ? <Message>{tr(messages, "rating.success")}</Message> : rating.isError ? <Message danger>{tr(messages, "common.error")}</Message> : null}</Card> : null}
    <Card><Text style={ui.h2}>{tr(messages, "report.title")}</Text><Field value={report} onChangeText={setReport} multiline label={tr(messages, "report.message")} /><PrimaryButton destructive label={tr(messages, "report.submit")} disabled={!report.trim() || complaint.isPending || complaint.isSuccess} onPress={() => complaint.mutate()} />{complaint.isSuccess ? <Message>{tr(messages, "report.success")}</Message> : complaint.isError ? <Message danger>{tr(messages, "common.error")}</Message> : null}</Card>
  </>}</Screen>;
}
