import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FlashList } from "@shopify/flash-list";
import Animated from "react-native-reanimated";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Field, Loading, Message, PrimaryButton, Row, Screen, SecondaryButton, day, money, useUi } from "../../components/PassengerScreen";
import { tr } from "../../core/i18n";
import { passengerServicesApi, type SavedPlace } from "../../core/passenger-api";
import { useMessages } from "../../core/use-messages";
import { EmptyState } from "../../components/EmptyState";
import { TripHistoryCard } from "../../components/TripHistoryCard";
import type { Trip } from "../../core/contracts";
import type { RootStackParamList } from "../../navigation/types";

export function TripsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Trips">) {
  const { locale, messages } = useMessages(), ui = useUi();
  // كل الرحلات السابقة: تحميل تدريجي صفحة بعد صفحة عند بلوغ نهاية القائمة.
  const query = useInfiniteQuery({
    queryKey: ["passenger-trips"],
    queryFn: ({ pageParam }) => passengerServicesApi.trips(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last: { page: number; limit: number; total: number }) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
  });
  const items = query.data?.pages.flatMap((entry) => entry.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  return (
    <Screen title={tr(messages, "trips.title")} onBack={navigation.goBack} scroll={false}>
      <View style={{ flex: 1, padding: 16 }}>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <Message danger>{tr(messages, "common.error")}</Message>
        ) : (
          <FlashList
            data={items}
            estimatedItemSize={132}
            ListHeaderComponent={
              total ? (
                <Text style={ui.section}>{`${tr(messages, "trips.total")}: ${total}`}</Text>
              ) : null
            }
            ListEmptyComponent={<EmptyState art="trips" title={tr(messages, "trips.empty")}/>}
            ListFooterComponent={query.isFetchingNextPage ? <Loading /> : null}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
            }}
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            renderItem={({ item }) => (
              <TripHistoryCard
                trip={item as unknown as Trip}
                locale={locale}
                messages={messages}
                onPress={() => navigation.navigate("TripDetails", { tripId: item.id })}
              />
            )}
          />
        )}
      </View>
    </Screen>
  );
}
export function TripDetailsScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "TripDetails">) {
  const { locale, messages } = useMessages(), ui = useUi();
  const query = useQuery({ queryKey: ["passenger-trip", route.params.tripId], queryFn: () => passengerServicesApi.trip(route.params.tripId) });
  const trip = query.data;
  return <Screen title={tr(messages, "trips.details")} onBack={navigation.goBack}>{query.isPending ? <Loading /> : query.isError || !trip ? <Message danger>{tr(messages, "common.error")}</Message> : <><Card><Animated.Text sharedTransitionTag={`trip-fare-${trip.id}`} style={ui.heroValue}>{money(trip.fare, trip.currency)}</Animated.Text><Text style={ui.heroLabel}>{tr(messages, `trip.status.${trip.status}`)}</Text></Card><Card><Row title={tr(messages, "home.pickup")} subtitle={trip.pickupAddress} /><Row title={tr(messages, "home.destination")} subtitle={trip.destAddress} /><Row title={tr(messages, "trips.date")} value={day(trip.createdAt as string | undefined, locale)} /></Card>{trip.driver ? <Card><Text style={ui.h2}>{tr(messages, "trips.driver")}</Text><Row title={trip.driver.name ?? ""} value={trip.driver.rating == null ? undefined : String(trip.driver.rating)} />{trip.vehicle ? <Row title={[trip.vehicle.make, trip.vehicle.model].filter(Boolean).join(" ")} subtitle={[trip.vehicle.color, trip.vehicle.plate].filter(Boolean).join(" · ")} /> : null}</Card> : null}<PrimaryButton label={tr(messages, "trip.actions")} onPress={() => navigation.navigate("TripCompletion", { tripId: trip.id })} /></>}</Screen>;
}
export function PlacesScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Places">) {
  const { messages } = useMessages(), ui = useUi(); const client = useQueryClient();
  const query = useQuery({ queryKey: ["saved-places"], queryFn: passengerServicesApi.places });
  const remove = useMutation({ mutationFn: passengerServicesApi.removePlace, onSuccess: () => client.invalidateQueries({ queryKey: ["saved-places"] }) });
  const saved = (query.data ?? []).filter((x) => x.kind !== "RECENT"), recents = (query.data ?? []).filter((x) => x.kind === "RECENT");
  const place = (item: SavedPlace) => <Card key={item.id}><Row title={item.label} subtitle={item.address} /><Pressable onPress={() => remove.mutate(item.id)}><Text style={ui.dangerText}>{tr(messages, "common.delete")}</Text></Pressable></Card>;
  return <Screen title={tr(messages, "places.title")} onBack={navigation.goBack}><View style={ui.chipRow}>{(["HOME", "WORK", "OTHER"] as const).map((kind) => <Pressable key={kind} style={ui.chip} onPress={() => navigation.navigate("PlaceEditor", { kind })}><Text style={ui.chipText}>{tr(messages, `places.kind.${kind}`)}</Text></Pressable>)}</View>{query.isPending ? <Loading /> : query.isError ? <Message danger>{tr(messages, "common.error")}</Message> : <>{saved.length ? saved.map(place) : <EmptyState art="empty" title={tr(messages, "places.empty")}/>}{recents.length ? <><Text style={ui.section}>{tr(messages, "places.recents")}</Text>{recents.map(place)}</> : null}</>}</Screen>;
}
export function PlaceEditorScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "PlaceEditor">) {
  const { messages } = useMessages(), ui = useUi(); const client = useQueryClient(); const [label, setLabel] = useState(""); const [search, setSearch] = useState(""); const [selected, setSelected] = useState<{ address: string; lat: number; lng: number; placeId?: string } | null>(null);
  const suggestions = useQuery({ queryKey: ["place-editor", search], queryFn: () => passengerServicesApi.autocomplete(search), enabled: search.trim().length > 1 });
  const save = useMutation({ mutationFn: () => passengerServicesApi.createPlace({ kind: route.params.kind, label: label.trim(), address: selected!.address, lat: selected!.lat, lng: selected!.lng, placeId: selected!.placeId }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["saved-places"] }); navigation.goBack(); } });
  async function choose(item: { address?: string; description?: string; lat?: number; lng?: number; placeId?: string }) { let candidate = item; if (candidate.lat == null || candidate.lng == null) candidate = (await passengerServicesApi.geocode(item.address ?? item.description ?? ""))[0] ?? candidate; if (candidate.lat == null || candidate.lng == null) return; const address = candidate.address ?? candidate.description ?? ""; setSelected({ address, lat: candidate.lat, lng: candidate.lng, placeId: candidate.placeId }); setSearch(address); if (!label) setLabel(tr(messages, `places.kind.${route.params.kind}`)); }
  return <Screen title={tr(messages, "places.add")} onBack={navigation.goBack}><Field value={label} onChangeText={setLabel} label={tr(messages, "places.label")} /><Field value={search} onChangeText={(value) => { setSearch(value); setSelected(null); }} label={tr(messages, "places.address")} />{suggestions.isFetching ? <Loading /> : suggestions.data?.map((item, index) => <Card key={String(item.id ?? item.placeId ?? index)} onPress={() => void choose(item)}><Row title={item.address ?? item.description ?? item.label ?? item.name ?? ""} /></Card>)}{selected ? <Message>{selected.address}</Message> : null}<PrimaryButton label={tr(messages, "common.save")} disabled={!selected || !label.trim() || save.isPending} onPress={() => save.mutate()} /><SecondaryButton label={tr(messages, "common.cancel")} onPress={navigation.goBack} /></Screen>;
}
