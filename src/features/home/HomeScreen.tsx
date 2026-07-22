import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { AnimatedRegion, LatLng, Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type {
  PlaceSuggestion,
  Point,
  Quote,
  Trip,
  VehicleType,
} from "../../core/contracts";
import { managedAsset, syncManagedAssets } from "../../core/assets";
import { loadTranslations, tr } from "../../core/i18n";
import { useSession } from "../../core/session-store";
import { connectTrip, type TripEvent } from "../trip/realtime";
import { passengerApi } from "../trip/trip-api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { passengerServicesApi, type PassengerPaymentMethod } from "../../core/passenger-api";

type SearchTarget = "pickup" | "destination";
type Negotiation = { id: string; suggestedFare?: number; suggested?: number };
const ACTIVE = new Set([
  "SEARCHING",
  "ACCEPTED",
  "ARRIVING",
  "IN_PROGRESS",
]);
const assetFallbackByClass: Record<string, string> = {
  ECONOMY: "vehicle.category.economy",
  COMFORT: "vehicle.category.comfort",
  VAN: "vehicle.category.family",
  XL: "vehicle.category.family",
  BIKE: "vehicle.category.bike",
};

export function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Home">) {
  const profile = useSession((s) => s.profile);
  const map = useRef<MapView>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [pickup, setPickup] = useState<Point | null>(null);
  const [destination, setDestination] = useState<Point | null>(null);
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<VehicleType | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [payment, setPayment] = useState<PassengerPaymentMethod["method"] | null>(null);
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [proposedFare, setProposedFare] = useState("");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [assetRevision, setAssetRevision] = useState(0);
  const driverCoordinate = useRef(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;
  const hasDriverCoordinate = useRef(false);

  useEffect(() => {
    loadTranslations(profile?.locale ?? "ar")
      .then(setMessages)
      .catch(() => undefined);
    syncManagedAssets()
      .then(() => setAssetRevision((x) => x + 1))
      .catch(() => undefined);
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setPickup({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    })();
  }, [profile?.locale]);

  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: passengerApi.catalog,
    staleTime: 60_000,
  });
  const paymentMethods = useQuery({
    queryKey: ["passenger-payment-methods"],
    queryFn: passengerServicesApi.paymentMethods,
    staleTime: 60_000,
  });
  useEffect(() => {
    const methods = paymentMethods.data ?? [];
    if (!payment || !methods.some((item) => item.method === payment)) {
      setPayment(methods[0]?.method ?? null);
    }
  }, [paymentMethods.data, payment]);
  const suggestions = useQuery({
    queryKey: ["places", searchTarget, search, pickup],
    queryFn: () => passengerApi.autocomplete(search, pickup ?? undefined),
    enabled: !!searchTarget && search.trim().length > 1,
    staleTime: 30_000,
  });
  const offers = useQuery({
    queryKey: ["fareOffers", negotiation?.id],
    queryFn: () => passengerApi.offers(negotiation!.id),
    enabled: !!negotiation,
    refetchInterval: negotiation ? 3000 : false,
  });
  const tripPoll = useQuery({
    queryKey: ["trip", trip?.id],
    queryFn: () => passengerApi.getRide(trip!.id),
    enabled: !!trip?.id && ACTIVE.has(trip.status),
    refetchInterval: trip?.id && ACTIVE.has(trip.status) ? 8000 : false,
  });
  const route = useQuery({
    queryKey: ["route", pickup, destination],
    queryFn: () => passengerApi.directions(pickup!, destination!),
    enabled: !!pickup && !!destination,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (tripPoll.data) setTrip((old) => ({ ...old, ...tripPoll.data }) as Trip);
  }, [tripPoll.data]);
  useEffect(() => {
    if (!trip?.id || !ACTIVE.has(trip.status)) return;
    let dispose: (() => void) | undefined;
    let disposed = false;
    const update = (event: TripEvent) => {
      if (typeof event.lat === "number" && typeof event.lng === "number") {
        if (!hasDriverCoordinate.current) {
          driverCoordinate.setValue({
            latitude: event.lat,
            longitude: event.lng,
            latitudeDelta: 0,
            longitudeDelta: 0,
          });
          hasDriverCoordinate.current = true;
        } else {
          driverCoordinate
            .timing({
              latitude: event.lat,
              longitude: event.lng,
              duration: 900,
              useNativeDriver: false,
            } as Parameters<typeof driverCoordinate.timing>[0])
            .start();
        }
        setTrip((old) =>
          old
            ? {
                ...old,
                driverLat: event.lat,
                driverLng: event.lng,
                heading: event.heading,
              }
            : old,
        );
      } else setTrip((old) => (old ? ({ ...old, ...event } as Trip) : old));
    };
    void connectTrip(trip.id, update)
      .then((close) => {
        if (disposed) close();
        else dispose = close;
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      dispose?.();
    };
  }, [driverCoordinate, trip?.id, trip?.status]);

  useEffect(() => {
    if (!pickup) return;
    const coordinates = [
      pickup,
      destination,
      trip?.driverLat != null && trip.driverLng != null
        ? { lat: trip.driverLat, lng: trip.driverLng }
        : null,
    ].filter(Boolean) as Point[];
    if (coordinates.length > 1)
      map.current?.fitToCoordinates(
        coordinates.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        {
          edgePadding: { top: 110, right: 48, bottom: 310, left: 48 },
          animated: true,
        },
      );
  }, [pickup, destination, trip?.driverLat, trip?.driverLng]);

  const vehicles = useMemo(
    () => catalog.data?.categories.flatMap((category) => category.types) ?? [],
    [catalog.data],
  );
  const choosePlace = async (item: PlaceSuggestion) => {
    const label =
      item.address ?? item.description ?? item.label ?? item.name ?? "";
    const point =
      item.lat != null && item.lng != null
        ? { lat: Number(item.lat), lng: Number(item.lng), address: label }
        : await passengerApi.geocode(label);
    if (searchTarget === "pickup") setPickup(point);
    else {
      setDestination(point);
      setSelected(null);
      setQuote(null);
      setNegotiation(null);
    }
    setSearch("");
    setSearchTarget(null);
  };
  const quoteMutation = useMutation({
    mutationFn: async (vehicle: VehicleType) => {
      if (!pickup || !destination) throw Error("ROUTE_REQUIRED");
      const value = await passengerApi.quote(
        pickup,
        destination,
        vehicle.id,
        vehicle.rideClass,
      );
      setSelected(vehicle);
      setQuote(value);
      return value;
    },
  });
  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!pickup || !destination || !selected || !payment) throw Error("ROUTE_REQUIRED");
      const value = await passengerApi.requestRide(
        pickup,
        destination,
        selected.id,
        selected.rideClass,
        payment,
      );
      setTrip(value);
      return value;
    },
  });
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!trip) return;
      await passengerApi.cancelRide(trip.id);
      resetRide();
    },
  });
  const startNegotiation = async () => {
    if (!pickup || !destination || !selected) return;
    const value = await passengerApi.createNegotiation(
      pickup,
      destination,
      selected.id,
      selected.rideClass,
    );
    setNegotiation(value);
    setProposedFare(
      String(
        value.suggestedFare ??
          value.suggested ??
          quote?.fare ??
          quote?.total ??
          "",
      ),
    );
  };
  const resetRide = () => {
    setTrip(null);
    setNegotiation(null);
    setSelected(null);
    setQuote(null);
    setDestination(null);
    setProposedFare("");
  };

  if (!pickup)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#111" />
        <Text style={styles.muted}>
          {tr(messages, "home.locationRequired")}
        </Text>
      </View>
    );
  const driverVisible = trip?.driverLat != null && trip.driverLng != null;
  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate("Menu")}
        style={{ position: "absolute", zIndex: 20, top: 54, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", elevation: 5 }}
      >
        <Text style={{ color: "#111", fontSize: 25, fontWeight: "800" }}>☰</Text>
      </Pressable>
      <MapView
        ref={map}
        style={styles.map}
        initialRegion={{
          latitude: pickup.lat,
          longitude: pickup.lng,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
          pinColor="#111111"
        />
        {destination ? (
          <Marker
            coordinate={{
              latitude: destination.lat,
              longitude: destination.lng,
            }}
            pinColor="#D9A520"
          />
        ) : null}
        {driverVisible ? (
          <Marker.Animated
            coordinate={driverCoordinate as unknown as LatLng}
            rotation={Number(trip?.heading ?? 0)}
            anchor={{ x: 0.5, y: 0.5 }}
          />
        ) : null}
        {route.data?.length ? (
          <Polyline
            coordinates={route.data}
            strokeColor="#16181C"
            strokeWidth={5}
          />
        ) : null}
      </MapView>

      {!trip ? (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(180)}
          style={styles.topCard}
        >
          <Pressable
            onPress={() => setSearchTarget("pickup")}
            style={styles.locationRow}
          >
            <View style={[styles.dot, { backgroundColor: "#111" }]} />
            <View style={styles.flex}>
              <Text style={styles.label}>{tr(messages, "home.pickup")}</Text>
              <Text numberOfLines={1} style={styles.locationText}>
                {pickup.address ?? tr(messages, "home.currentLocation")}
              </Text>
            </View>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            onPress={() => setSearchTarget("destination")}
            style={styles.locationRow}
          >
            <View style={[styles.dot, { backgroundColor: "#D9A520" }]} />
            <View style={styles.flex}>
              <Text style={styles.label}>
                {tr(messages, "home.destination")}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.locationText, !destination && styles.muted]}
              >
                {destination?.address ?? tr(messages, "home.destinationHint")}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      {searchTarget ? (
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(180)}
          style={styles.searchSheet}
        >
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>
            {tr(
              messages,
              searchTarget === "pickup"
                ? "home.pickup"
                : "home.chooseDestination",
            )}
          </Text>
          <TextInput
            autoFocus
            value={search}
            onChangeText={setSearch}
            placeholder={tr(messages, "home.destinationHint")}
            style={styles.searchInput}
          />
          <View style={{ height: 260 }}>
            <FlashList
              data={suggestions.data ?? []}
              estimatedItemSize={64}
              keyExtractor={(x, i) => String(x.id ?? x.placeId ?? i)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => void choosePlace(item)}
                  style={styles.suggestion}
                >
                  <Text numberOfLines={2} style={styles.locationText}>
                    {item.address ??
                      item.description ??
                      item.label ??
                      item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
          <Pressable
            onPress={() => {
              setSearchTarget(null);
              setSearch("");
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.buttonTextDark}>
              {tr(messages, "common.back")}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {destination && !searchTarget && !trip ? (
        <Animated.View
          entering={SlideInDown.springify().damping(21)}
          exiting={SlideOutDown.duration(180)}
          style={styles.bottomSheet}
        >
          <View style={styles.handle} />
          {negotiation ? (
            <NegotiationPanel
              messages={messages}
              proposed={proposedFare}
              setProposed={setProposedFare}
              offers={offers.data ?? []}
              onSend={() =>
                void passengerApi.propose(negotiation.id, Number(proposedFare))
              }
              onAccept={(id) =>
                void passengerApi.acceptOffer(negotiation.id, id).then(setTrip)
              }
              onBack={() => setNegotiation(null)}
            />
          ) : (
            <>
              <Text style={styles.sheetTitle}>
                {tr(messages, "home.chooseRide")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.vehicleList}
              >
                {vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    locale={profile?.locale ?? "ar"}
                    selected={selected?.id === vehicle.id}
                    revision={assetRevision}
                    messages={messages}
                    onPress={() => quoteMutation.mutate(vehicle)}
                  />
                ))}
              </ScrollView>
              {!vehicles.length ? (
                <Text style={styles.muted}>
                  {tr(messages, "home.noVehicles")}
                </Text>
              ) : null}
              {quoteMutation.isPending ? (
                <ActivityIndicator color="#111" />
              ) : null}
              {quote && selected ? (
                <Animated.View entering={FadeIn.duration(220)}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.muted}>
                      {tr(messages, "home.price")}
                    </Text>
                    <Text style={styles.price}>
                      {String(quote.fare ?? quote.total ?? quote.amount ?? "")}{" "}
                      {quote.currency ??
                        selected.resolvedPricing?.currency ??
                        ""}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    {selected.etaMinutes != null ? (
                      <Text style={styles.meta}>
                        {selected.etaMinutes} {tr(messages, "home.eta")}
                      </Text>
                    ) : null}
                    {selected.capacity ? (
                      <Text style={styles.meta}>
                        {selected.capacity} {tr(messages, "home.capacity")}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.paymentRow}>
                    {(paymentMethods.data ?? []).filter((item) => item.method !== "WALLET" || selected.supportsWallet).map((item) => (
                      <Pressable key={`${item.method}:${item.provider ?? ""}`} onPress={() => setPayment(item.method)} style={[styles.chip, payment === item.method && styles.chipActive]}>
                        <Text>{tr(messages, item.labelKey)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    disabled={requestMutation.isPending || !payment}
                    onPress={() => requestMutation.mutate()}
                    style={styles.primaryButton}
                  >
                    {requestMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonTextLight}>
                        {tr(messages, "home.requestRide")}
                      </Text>
                    )}
                  </Pressable>
                  {selected.allowsNegotiation ? (
                    <Pressable
                      onPress={() => void startNegotiation()}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.buttonTextDark}>
                        {tr(messages, "home.negotiate")}
                      </Text>
                    </Pressable>
                  ) : null}
                </Animated.View>
              ) : null}
            </>
          )}
        </Animated.View>
      ) : null}

      {trip ? (
        <TripPanel
          trip={trip}
          messages={messages}
          payment={payment}
          cancelPending={cancelMutation.isPending}
          onCancel={() => cancelMutation.mutate()}
          onCommunicate={() => navigation.navigate("TripCommunication", { tripId: trip.id })}
          onClose={resetRide}
        />
      ) : null}
    </View>
  );
}

function VehicleCard({
  vehicle,
  locale,
  selected,
  revision,
  messages,
  onPress,
}: {
  vehicle: VehicleType;
  locale: string;
  selected: boolean;
  revision: number;
  messages: Record<string, string>;
  onPress: () => void;
}) {
  const key = vehicle.imageAssetKey;
  const asset = key ? managedAsset(key) : null;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.vehicleCard, selected && styles.vehicleSelected]}
    >
      {asset ? (
        <Image
          key={`${asset.etag}-${revision}`}
          source={{ uri: asset.localUri }}
          resizeMode="contain"
          style={styles.vehicleImage}
        />
      ) : (
        <View style={[styles.vehicleImage, styles.vehicleImageFallback]}>
          <Text numberOfLines={1} style={styles.vehicleImageFallbackText}>
            {tr(messages, assetFallbackByClass[vehicle.rideClass] ?? "")}
          </Text>
        </View>
      )}
      <Text numberOfLines={1} style={styles.vehicleName}>
        {vehicle.nameI18n?.[locale] ?? vehicle.name}
      </Text>
      {vehicle.etaMinutes != null ? (
        <Text style={styles.vehicleEta}>{vehicle.etaMinutes}</Text>
      ) : null}
    </Pressable>
  );
}
function NegotiationPanel({
  messages,
  proposed,
  setProposed,
  offers,
  onSend,
  onAccept,
  onBack,
}: {
  messages: Record<string, string>;
  proposed: string;
  setProposed: (x: string) => void;
  offers: {
    id: string;
    fare: number;
    driver?: { name?: string; rating?: number };
  }[];
  onSend: () => void;
  onAccept: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <Animated.View entering={FadeIn}>
      <Text style={styles.sheetTitle}>
        {tr(messages, "home.negotiationTitle")}
      </Text>
      <Text style={styles.muted}>{tr(messages, "home.negotiationHint")}</Text>
      <TextInput
        value={proposed}
        onChangeText={setProposed}
        keyboardType="decimal-pad"
        style={styles.fareInput}
      />
      <Pressable onPress={onSend} style={styles.primaryButton}>
        <Text style={styles.buttonTextLight}>
          {tr(messages, "home.sendOffer")}
        </Text>
      </Pressable>
      <Text style={[styles.label, { marginTop: 16 }]}>
        {tr(messages, "home.driverOffers")}
      </Text>
      {offers.length ? (
        offers.map((offer) => (
          <Pressable
            key={offer.id}
            onPress={() => onAccept(offer.id)}
            style={styles.offerRow}
          >
            <View>
              <Text style={styles.vehicleName}>
                {offer.driver?.name ?? tr(messages, "home.driver")}
              </Text>
              {offer.driver?.rating != null ? (
                <Text style={styles.muted}>{offer.driver.rating}</Text>
              ) : null}
            </View>
            <Text style={styles.price}>{offer.fare}</Text>
            <Text style={styles.accept}>
              {tr(messages, "home.acceptOffer")}
            </Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.muted}>{tr(messages, "home.noOffers")}</Text>
      )}
      <Pressable onPress={onBack} style={styles.secondaryButton}>
        <Text style={styles.buttonTextDark}>{tr(messages, "common.back")}</Text>
      </Pressable>
    </Animated.View>
  );
}
function TripPanel({
  trip,
  messages,
  payment,
  cancelPending,
  onCancel,
  onCommunicate,
  onClose,
}: {
  trip: Trip;
  messages: Record<string, string>;
  payment: string | null;
  cancelPending: boolean;
  onCancel: () => void;
  onCommunicate: () => void;
  onClose: () => void;
}) {
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.9 + pulse.value * 0.1 }],
  }));
  const completed = trip.status === "COMPLETED",
    searching = trip.status === "SEARCHING";
  const title = completed
    ? "home.tripCompleted"
    : trip.status === "IN_PROGRESS"
      ? "home.tripInProgress"
      : searching
          ? "home.searching"
          : "home.driverArriving";
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(20)}
      style={styles.bottomSheet}
    >
      <View style={styles.handle} />
      {searching ? <Animated.View style={[styles.pulse, pulseStyle]} /> : null}
      <Text style={styles.sheetTitle}>{tr(messages, title)}</Text>
      {searching ? (
        <Text style={styles.muted}>{tr(messages, "home.searchingHint")}</Text>
      ) : null}
      {trip.driver ? (
        <View style={styles.driverCard}>
          <View style={styles.avatar}>
            {trip.driver.avatarUrl ? (
              <Image
                source={{ uri: trip.driver.avatarUrl }}
                style={styles.avatarImage}
              />
            ) : null}
          </View>
          <View style={styles.flex}>
            <Text style={styles.vehicleName}>
              {trip.driver.name ?? tr(messages, "home.driver")}
            </Text>
            {trip.driver.rating != null ? (
              <Text style={styles.muted}>
                {tr(messages, "home.rating")}: {trip.driver.rating}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      <View style={styles.details}>
        <Detail label={tr(messages, "home.from")} value={trip.pickupAddress} />
        <Detail label={tr(messages, "home.to")} value={trip.destAddress} />
        {trip.vehicle ? (
          <Detail
            label={tr(messages, "home.vehicle")}
            value={[trip.vehicle.make, trip.vehicle.model, trip.vehicle.color]
              .filter(Boolean)
              .join(" ")}
          />
        ) : null}
        {trip.vehicle?.plate ? (
          <Detail
            label={tr(messages, "home.plate")}
            value={trip.vehicle.plate}
          />
        ) : null}
        <Detail
          label={tr(messages, "home.payment")}
          value={payment ? tr(messages, `payment.method.${payment}`) : undefined}
        />
      </View>
      {["ACCEPTED", "ARRIVING", "IN_PROGRESS"].includes(trip.status) ? (
        <Pressable onPress={onCommunicate} style={styles.primaryButton}>
          <Text style={styles.buttonTextLight}>{tr(messages, "communication.title")}</Text>
        </Pressable>
      ) : null}
      {completed ? (
        <Pressable onPress={onClose} style={styles.primaryButton}>
          <Text style={styles.buttonTextLight}>
            {tr(messages, "home.close")}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          disabled={cancelPending || trip.status === "IN_PROGRESS"}
          onPress={onCancel}
          style={[
            styles.secondaryButton,
            trip.status === "IN_PROGRESS" && styles.disabled,
          ]}
        >
          {cancelPending ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.buttonTextDark}>
              {tr(messages, "home.cancelRide")}
            </Text>
          )}
        </Pressable>
      )}
    </Animated.View>
  );
}
function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text numberOfLines={2} style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}
const styles = {
  root: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  flex: { flex: 1 },
  topCard: {
    position: "absolute",
    top: 54,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  locationRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  divider: { height: 1, backgroundColor: "#ececec", marginLeft: 22 },
  label: { fontSize: 12, fontWeight: "700", color: "#6b6b6b" },
  locationText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#151515",
    marginTop: 2,
  },
  muted: { fontSize: 14, color: "#707070", lineHeight: 20 },
  searchSheet: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "65%",
    backgroundColor: "#fff",
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#dedede",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.4,
  },
  searchInput: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#f3f3f3",
    paddingHorizontal: 16,
    fontSize: 17,
    color: "#111",
    marginVertical: 16,
  },
  suggestion: {
    minHeight: 64,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  vehicleList: { gap: 10, paddingVertical: 14 },
  vehicleCard: {
    width: 148,
    minHeight: 128,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e4e4e4",
    padding: 10,
    backgroundColor: "#fff",
  },
  vehicleSelected: {
    borderWidth: 2,
    borderColor: "#111",
    backgroundColor: "#faf8f2",
  },
  vehicleImage: { width: "100%", height: 72 },
  vehicleImageFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  vehicleImageFallbackText: { fontSize: 12, color: "#8a8a8a", fontWeight: "700" },
  vehicleName: { fontSize: 16, fontWeight: "800", color: "#151515" },
  vehicleEta: { fontSize: 12, color: "#777", marginTop: 3 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  price: { fontSize: 21, fontWeight: "900", color: "#111" },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  meta: { fontSize: 13, color: "#686868" },
  paymentRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  chip: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { borderColor: "#111", backgroundColor: "#f4f4f4" },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonTextLight: { fontSize: 16, fontWeight: "800", color: "#fff" },
  buttonTextDark: { fontSize: 16, fontWeight: "800", color: "#111" },
  fareInput: {
    height: 58,
    borderWidth: 1,
    borderColor: "#d8d8d8",
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 14,
  },
  offerRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  accept: { fontSize: 13, fontWeight: "800", color: "#8a6410" },
  pulse: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignSelf: "center",
    backgroundColor: "#D9A520",
    marginBottom: 14,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ececec",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  details: {
    borderRadius: 17,
    backgroundColor: "#f6f6f6",
    paddingHorizontal: 14,
  },
  detailRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: "#171717",
  },
  disabled: { opacity: 0.35 },
} as const;
