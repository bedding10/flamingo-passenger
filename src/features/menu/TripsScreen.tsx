import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { passengerServicesApi } from "../../core/passenger-api";
import { useTheme } from "../../core/theme-store";
import { useMessages } from "../../core/use-messages";
import { tr } from "../../core/i18n";
import type { RootStackParamList } from "../../navigation/types";
import { MenuScaffold, SectionLabel } from "../../components/menu/MenuScaffold";
import { TripHistoryCard } from "../../components/TripHistoryCard";
import { spacing, typography } from "../../design/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Trips">;

const ACTIVE = new Set(["SEARCHING", "ACCEPTED", "ARRIVING", "IN_PROGRESS"]);

export function TripsScreen({ navigation }: Props) {
  const { palette } = useTheme();
  const { locale, messages } = useMessages();
  const trips = useQuery({
    queryKey: ["trips", 1],
    queryFn: () => passengerServicesApi.trips(1),
    staleTime: 30_000,
  });

  const { upcoming, past } = useMemo(() => {
    const items = trips.data?.items ?? [];
    return {
      upcoming: items.filter((trip) => ACTIVE.has(trip.status)),
      past: items.filter((trip) => !ACTIVE.has(trip.status)),
    };
  }, [trips.data]);

  const open = (tripId: string) => navigation.navigate("TripDetails", { tripId });
  const empty = !trips.isLoading && !upcoming.length && !past.length;

  return (
    <MenuScaffold
      title={tr(messages, "trips.title")}
      subtitle={tr(messages, "trips.subtitle")}
      onBack={() => navigation.goBack()}
      loading={trips.isLoading}
    >
      {empty ? (
        <Text style={[styles.empty, { color: palette.textMuted }]}>
          {tr(messages, "trips.empty")}
        </Text>
      ) : null}

      {upcoming.length ? (
        <>
          <SectionLabel>{tr(messages, "trips.upcoming")}</SectionLabel>
          {upcoming.map((trip) => (
            <TripHistoryCard
              key={trip.id}
              trip={trip}
              locale={locale}
              messages={messages}
              onPress={() => open(trip.id)}
            />
          ))}
        </>
      ) : null}

      {past.length ? (
        <>
          <SectionLabel>{tr(messages, "trips.past")}</SectionLabel>
          {past.map((trip) => (
            <TripHistoryCard
              key={trip.id}
              trip={trip}
              locale={locale}
              messages={messages}
              onPress={() => open(trip.id)}
            />
          ))}
        </>
      ) : null}
    </MenuScaffold>
  );
}

const styles = StyleSheet.create({
  empty: {
    ...typography.body,
    textAlign: "center",
    paddingVertical: spacing.xxxl,
  },
});

export default TripsScreen;
