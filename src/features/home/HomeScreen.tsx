import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { AnimatedRegion, LatLng, Marker, Polyline, type Region } from "react-native-maps";
import * as Location from "expo-location";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import Animated, {
  Easing,
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
  FareOffer,
  PlaceSuggestion,
  Point,
  Quote,
  Trip,
  VehicleType,
} from "../../core/contracts";
import { managedAsset, syncManagedAssets } from "../../core/assets";
import { loadTranslations, tr } from "../../core/i18n";
import { reportError } from "../../core/observability";
import { useSession } from "../../core/session-store";
import {
  NIGHT_MAP_JSON,
  overlayFor,
  withAlpha,
  type Palette,
} from "../../core/theme";
import { nextMode, useTheme } from "../../core/theme-store";
import { connectTrip, type TripEvent } from "../trip/realtime";
import { passengerApi } from "../trip/trip-api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { passengerServicesApi, type PassengerPaymentMethod } from "../../core/passenger-api";

type SearchTarget = "pickup" | "destination" | `stop:${number}`;
// Intermediate stops are addressed as "stop:0", "stop:1", ... so a single
// search sheet can edit every point of the route.
const stopTarget = (index: number): SearchTarget => `stop:${index}`;
const stopIndexOf = (target: SearchTarget | null): number | null =>
  target && target.startsWith("stop:") ? Number(target.slice(5)) : null;
type Negotiation = { id: string; suggestedFare?: number; suggested?: number };
const ACTIVE = new Set([
  "SEARCHING",
  "ACCEPTED",
  "ARRIVING",
  "IN_PROGRESS",
]);
// Top-down vehicle artwork used for the live driver marker. Bundled in the
// app (3KB each) so the marker draws instantly, offline, with no network hop.
const CAR_MARKER = require("../../../assets/vehicle-car.png");
const MOTO_MARKER = require("../../../assets/vehicle-moto.png");
const markerForClass = (rideClass?: string) =>
  rideClass === "BIKE" || rideClass === "MOTO" ? MOTO_MARKER : CAR_MARKER;
// Bundled 3D class artwork (used until the dashboard ships its own image for
// a class). Local files draw instantly, with no network round trip.
const CLASS_ART: Record<string, number> = {
  ECONOMY: require("../../../assets/class-economy.png"),
  COMFORT: require("../../../assets/class-comfort.png"),
  SEDAN: require("../../../assets/class-comfort.png"),
  PREMIUM: require("../../../assets/class-comfort.png"),
  VAN: require("../../../assets/class-xl.png"),
  XL: require("../../../assets/class-xl.png"),
  BIKE: require("../../../assets/class-bike.png"),
  MOTO: require("../../../assets/class-bike.png"),
};
const classArt = (rideClass?: string) =>
  CLASS_ART[rideClass ?? ""] ?? CLASS_ART.ECONOMY;
// Illustration shown while the app is asking for (or missing) the location.
const LOCATION_ART = require("../../../assets/illustration-location.png");
// Algiers city centre: last-resort region so the map is never blank.
const FALLBACK_POINT = { lat: 36.7538, lng: 3.0588 };
// Matches the backend limit (ArrayMaxSize(3) on RequestRideDto.stops).
const MAX_STOPS = 3;
const assetFallbackByClass: Record<string, string> = {
  ECONOMY: "vehicle.category.economy",
  COMFORT: "vehicle.category.comfort",
  VAN: "vehicle.category.family",
  XL: "vehicle.category.family",
  BIKE: "vehicle.category.bike",
};
// Single toggle button: shows the mode the tap will switch to.
const THEME_ICON: Record<string, string> = {
  light: "\u25D0",
  dark: "\u25D1",
};

export function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Home">) {
  const profile = useSession((s) => s.profile);
  const { palette, name: themeName, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(palette, themeName), [palette, themeName]);
  const map = useRef<MapView>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [pickup, setPickup] = useState<Point | null>(null);
  const [destination, setDestination] = useState<Point | null>(null);
  // Intermediate stops the driver must pass through. A slot stays null while
  // the passenger is still picking its place, and is pruned when unused.
  const [stops, setStops] = useState<Array<Point | null>>([]);
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null);
  const [search, setSearch] = useState("");
  // Optional Uber/Heetch style centre-pin picking for the active point.
  const [pinMode, setPinMode] = useState<SearchTarget | null>(null);
  const [pinAddress, setPinAddress] = useState<string>("");
  const pinRegion = useRef<Region | null>(null);
  const [selected, setSelected] = useState<VehicleType | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [payment, setPayment] = useState<PassengerPaymentMethod["method"] | null>(null);
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [proposedFare, setProposedFare] = useState("");
  // Offers the passenger explicitly turned down. Kept on the client so the
  // list stays clean while the server keeps its own PENDING/EXPIRED lifecycle.
  const [dismissedOffers, setDismissedOffers] = useState<string[]>([]);
  // Optional free-text note shown to drivers together with the proposed fare.
  const [fareNote, setFareNote] = useState("");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [assetRevision, setAssetRevision] = useState(0);
  // The device position stays available as the FIRST suggestion ("my current
  // location") — it is never forced as the pickup point.
  const [deviceLocation, setDeviceLocation] = useState<Point | null>(null);
  const driverCoordinate = useRef(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;
  const hasDriverCoordinate = useRef(false);

  const [locationDenied, setLocationDenied] = useState(false);
  // Asking for the location is retryable: the illustration screen calls this
  // again when the passenger taps "allow", so a first refusal is not final.
  const requestLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationDenied(true);
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setLocationDenied(false);
      setDeviceLocation(point);
      setPickup((prev) => prev ?? point);
    } catch (e) {
      reportError(e, "home.location");
      setLocationDenied(true);
    }
  }, []);

  useEffect(() => {
    loadTranslations()
      .then(setMessages)
      .catch((e) => reportError(e, "home.i18n"));
    syncManagedAssets()
      .then(() => setAssetRevision((x) => x + 1))
      .catch((e) => reportError(e, "home.assets"));
    void requestLocation();
  }, [profile?.locale, requestLocation]);

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
    if (!pickup || pinMode) return;
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
          edgePadding: { top: 130, right: 48, bottom: 330, left: 48 },
          animated: true,
        },
      );
    else
      map.current?.animateCamera(
        { center: { latitude: pickup.lat, longitude: pickup.lng } },
        { duration: 450 },
      );
  }, [pickup, destination, pinMode, trip?.driverLat, trip?.driverLng]);

  const vehicles = useMemo(
    () => catalog.data?.categories.flatMap((category) => category.types) ?? [],
    [catalog.data],
  );

  const applyPoint = useCallback(
    (target: SearchTarget, point: Point) => {
      const stopIndex = stopIndexOf(target);
      if (stopIndex != null) {
        setStops((current) => {
          const next = [...current];
          next[stopIndex] = point;
          return next;
        });
        setQuote(null);
        setNegotiation(null);
        return;
      }
      if (target === "pickup") setPickup(point);
      else {
        setDestination(point);
        setSelected(null);
        setQuote(null);
        setNegotiation(null);
      }
    },
    [],
  );

  const choosePlace = async (item: PlaceSuggestion) => {
    const label =
      item.address ?? item.description ?? item.label ?? item.name ?? "";
    const point =
      item.lat != null && item.lng != null
        ? { lat: Number(item.lat), lng: Number(item.lng), address: label }
        : await passengerApi.geocode(label);
    applyPoint(searchTarget ?? "destination", point);
    setSearch("");
    setSearchTarget(null);
  };

  const useDeviceLocation = async () => {
    const target = searchTarget ?? "pickup";
    let point = deviceLocation;
    if (!point) {
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        point = { lat: position.coords.latitude, lng: position.coords.longitude };
        setDeviceLocation(point);
      } catch (e) {
        reportError(e, "home.location.current");
        return;
      }
    }
    applyPoint(target, {
      ...point,
      address: tr(messages, "home.currentLocation"),
    });
    setSearch("");
    setSearchTarget(null);
  };

  // Centre-pin picking: dragging the map updates the address via reverse
  // geocoding; confirming writes it into the active point.
  const onRegionChangeComplete = useCallback(
    (region: Region) => {
      pinRegion.current = region;
      if (!pinMode) return;
      void (async () => {
        try {
          const [place] = await Location.reverseGeocodeAsync({
            latitude: region.latitude,
            longitude: region.longitude,
          });
          const label = [place?.name, place?.street, place?.city]
            .filter(Boolean)
            .join(", ");
          setPinAddress(label);
        } catch (e) {
          reportError(e, "home.reverseGeocode");
          setPinAddress("");
        }
      })();
    },
    [pinMode],
  );
  const confirmPin = () => {
    const region = pinRegion.current;
    if (!pinMode || !region) return;
    applyPoint(pinMode, {
      lat: region.latitude,
      lng: region.longitude,
      address: pinAddress || tr(messages, "home.pinSelected"),
    });
    setPinMode(null);
    setPinAddress("");
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
        stops.filter((stop): stop is Point => !!stop),
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

  // Twinkling route line: a slow opacity sweep on the glow layers, ticked
  // only while a route is on screen (~11fps, no animation driver needed).
  const [glowTick, setGlowTick] = useState(0);
  const routeLength = route.data?.length ?? 0;
  useEffect(() => {
    if (!routeLength) return;
    const timer = setInterval(() => setGlowTick((value) => (value + 1) % 24), 90);
    return () => clearInterval(timer);
  }, [routeLength]);
  const glow = (1 + Math.sin((glowTick / 24) * Math.PI * 2)) / 2;

  // Back button: leaving the app takes two consecutive presses.
  const [exitHint, setExitHint] = useState(false);
  const lastBackPress = useRef(0);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (searchTarget) {
        setSearchTarget(null);
        setStops((current) => current.filter((stop) => !!stop));
        return true;
      }
      const now = Date.now();
      if (now - lastBackPress.current < 2000) return false;
      lastBackPress.current = now;
      setExitHint(true);
      setTimeout(() => setExitHint(false), 2000);
      return true;
    });
    return () => subscription.remove();
  }, [searchTarget]);

  if (!pickup)
    return (
      <View style={styles.center}>
        <Image
          source={LOCATION_ART}
          resizeMode="contain"
          style={styles.locationArt}
        />
        <Text style={styles.locationTitle}>
          {tr(messages, "home.locationRequired")}
        </Text>
        {locationDenied ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => void requestLocation()}
              style={styles.locationPrimary}
            >
              <Text style={styles.locationPrimaryText}>
                {tr(messages, "home.allowLocation")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickup(FALLBACK_POINT)}
              style={styles.locationSecondary}
            >
              <Text style={styles.locationSecondaryText}>
                {tr(messages, "home.continueWithoutLocation")}
              </Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={palette.text} />
        )}
      </View>
    );
  const driverVisible = trip?.driverLat != null && trip.driverLng != null;
  const searchOpen = !!searchTarget;
  const activeStopIndex = stopIndexOf(searchTarget);
  // Drops the slots the passenger opened but never filled.
  const pruneStops = () =>
    setStops((current) => current.filter((stop) => !!stop));
  const closeSearch = () => {
    setSearchTarget(null);
    setSearch("");
    pruneStops();
  };
  const hintFor = (target: SearchTarget) =>
    target === "pickup"
      ? "home.pickupHint"
      : stopIndexOf(target) != null
        ? "home.stopHint"
        : "home.destinationHint";

  // One row of the route editor: reads as text, becomes an input once active.
  const renderRouteField = (
    target: SearchTarget,
    label: string,
    value: string | undefined,
    marker: JSX.Element,
    onRemove?: () => void,
  ) => {
    const active = searchTarget === target;
    return (
      <View
        key={target}
        style={[styles.routeField, active && styles.routeFieldActive]}
      >
        {marker}
        <View style={styles.flex}>
          <Text style={styles.label}>{tr(messages, label)}</Text>
          {active ? (
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder={tr(messages, hintFor(target))}
              placeholderTextColor={palette.textMuted}
              style={styles.routeInput}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSearch("");
                setSearchTarget(target);
              }}
            >
              <Text
                numberOfLines={1}
                style={[styles.locationText, !value && styles.muted]}
              >
                {value || tr(messages, hintFor(target))}
              </Text>
            </Pressable>
          )}
        </View>
        {onRemove ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRemove}
            style={styles.routeRemove}
          >
            <Text style={styles.quickIconText}>{"\u00D7"}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };
  return (
    <View style={styles.root}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        customMapStyle={
          palette.mapStyle === "night"
            ? (NIGHT_MAP_JSON as unknown as Array<Record<string, unknown>>)
            : []
        }
        initialRegion={{
          latitude: pickup.lat,
          longitude: pickup.lng,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
{/* Monochrome markers: round for the pickup, square for the drop-off. */}
        <Marker
          coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.pickupMarker}>
            <View style={styles.pickupMarkerCore} />
          </View>
        </Marker>
        {destination ? (
          <Marker
            coordinate={{
              latitude: destination.lat,
              longitude: destination.lng,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.destinationMarker}>
              <View style={styles.destinationMarkerCore} />
            </View>
          </Marker>
        ) : null}
        {stops.map((stop, index) =>
          stop ? (
            <Marker
              key={`stop-marker-${index}`}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={styles.stopMarker}>
                <View style={styles.stopMarkerCore} />
              </View>
            </Marker>
          ) : null,
        )}
        {driverVisible ? (
          <Marker.Animated
            coordinate={driverCoordinate as unknown as LatLng}
            rotation={Number(trip?.heading ?? 0)}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            tracksViewChanges={false}
          >
            <Image
              source={markerForClass(
                (trip?.rideClass as string | undefined) ?? selected?.rideClass,
              )}
              style={styles.vehicleMarker}
              resizeMode="contain"
            />
          </Marker.Animated>
        ) : null}
        {route.data?.length ? (
          <>
            {/* Four stacked strokes build the glow: wide halo, soft halo, solid
                core and a travelling dashed highlight. */}
            <Polyline
              coordinates={route.data}
              strokeColor={withAlpha(palette.primary, 0.1 + glow * 0.12)}
              strokeWidth={18}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={route.data}
              strokeColor={withAlpha(palette.primary, 0.28 + glow * 0.22)}
              strokeWidth={11}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={route.data}
              strokeColor={palette.primary}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={route.data}
              strokeColor={withAlpha(palette.onPrimary, 0.25 + glow * 0.6)}
              strokeWidth={2}
              lineDashPattern={[5, 13]}
              lineCap="round"
            />
          </>
        ) : null}
      </MapView>

      {/* Floating circular controls over the map (Heetch style). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr(messages, "menu.title")}
        onPress={() => navigation.navigate("Menu")}
        style={[styles.floating, styles.floatingLeft]}
      >
        <Text style={styles.floatingIcon}>{"\u2630"}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr(messages, "theme.title")}
        onPress={() => setMode(nextMode(themeName))}
        style={[styles.floating, styles.floatingRight]}
      >
        <Text style={styles.floatingIcon}>
          {THEME_ICON[themeName] ?? THEME_ICON.light}
        </Text>
      </Pressable>

      {/* "Press back again to exit" hint. */}
      {exitHint ? (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          pointerEvents="none"
          style={styles.exitHint}
        >
          <Text style={styles.exitHintText}>
            {tr(messages, "home.exitHint")}
          </Text>
        </Animated.View>
      ) : null}

      {/* Centre pin: optional way to set the active point by dragging the map. */}
      {pinMode ? (
        <View pointerEvents="none" style={styles.pinWrap}>
          <View style={styles.pinHead} />
          <View style={styles.pinStem} />
        </View>
      ) : null}

      {searchOpen ? (
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(180)}
          style={styles.searchSheet}
        >
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{tr(messages, "home.whereTo")}</Text>
          <View style={styles.routeEditor}>
            {renderRouteField(
              "pickup",
              "home.pickup",
              pickup.address,
              <View style={styles.routeDot} />,
            )}
            {stops.map((stop, index) =>
              renderRouteField(
                stopTarget(index),
                "home.stop",
                stop?.address,
                <View style={styles.routeStopDot} />,
                () => {
                  setStops((current) =>
                    current.filter((_, position) => position !== index),
                  );
                  if (activeStopIndex === index) {
                    setSearch("");
                    setSearchTarget("destination");
                  }
                },
              ),
            )}
            {renderRouteField(
              "destination",
              "home.destination",
              destination?.address,
              <View style={styles.routeSquare} />,
            )}
          </View>
          {stops.length < MAX_STOPS ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const index = stops.length;
                setStops((current) => [...current, null]);
                setSearch("");
                setSearchTarget(stopTarget(index));
              }}
              style={styles.addStop}
            >
              <Text style={styles.addStopIcon}>{"\uFF0B"}</Text>
              <Text style={styles.addStopText}>
                {tr(messages, "home.addStop")}
              </Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => void useDeviceLocation()} style={styles.quickRow}>
            <View style={styles.quickIcon}>
              <Text style={styles.quickIconText}>{"\u25C9"}</Text>
            </View>
            <Text style={styles.locationText}>
              {tr(messages, "home.currentLocation")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setPinMode(searchTarget);
              closeSearch();
            }}
            style={styles.quickRow}
          >
            <View style={styles.quickIcon}>
              <Text style={styles.quickIconText}>{"\u2316"}</Text>
            </View>
            <Text style={styles.locationText}>
              {tr(messages, "home.chooseOnMap")}
            </Text>
          </Pressable>
          <View style={styles.suggestionList}>
            <FlashList
              data={suggestions.data ?? []}
              estimatedItemSize={64}
              keyboardShouldPersistTaps="handled"
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
            onPress={closeSearch}
            style={styles.secondaryButton}
          >
            <Text style={styles.buttonTextDark}>
              {tr(messages, "common.back")}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {pinMode && !trip ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(160)}
          style={styles.bottomSheet}
        >
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>
            {tr(
              messages,
              pinMode === "pickup" ? "home.choosePickup" : "home.chooseDestination",
            )}
          </Text>
          <Text numberOfLines={2} style={styles.locationText}>
            {pinAddress || tr(messages, "home.dragMap")}
          </Text>
          <Pressable onPress={confirmPin} style={styles.primaryButton}>
            <Text style={styles.buttonTextLight}>
              {tr(messages, "home.confirmPoint")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setPinMode(null);
              setPinAddress("");
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.buttonTextDark}>{tr(messages, "common.cancel")}</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {!trip && !searchOpen && !pinMode ? (
        <Animated.View
          entering={SlideInDown.springify().damping(21)}
          exiting={SlideOutDown.duration(180)}
          style={styles.bottomSheet}
        >
          <View style={styles.handle} />
          {negotiation ? (
            <NegotiationPanel
              styles={styles}
              messages={messages}
              proposed={proposedFare}
              placeholderColor={palette.textMuted}
              setProposed={setProposedFare}
              suggested={negotiation.suggestedFare ?? negotiation.suggested}
              offers={(offers.data ?? []).filter(
                (offer) => !dismissedOffers.includes(offer.id),
              )}
              note={fareNote}
              setNote={setFareNote}
              palette={palette}
              onSend={() =>
                void passengerApi.propose(
                  negotiation.id,
                  Number(proposedFare),
                  fareNote,
                )
              }
              onAccept={(id) =>
                void passengerApi.acceptOffer(negotiation.id, id).then(setTrip)
              }
              onDismiss={(id) => {
                // Hide immediately, then tell the server (the driver gets a
                // realtime "fare:offer_rejected" event).
                setDismissedOffers((current) =>
                  current.includes(id) ? current : [...current, id],
                );
                void passengerApi.rejectOffer(negotiation.id, id);
              }}
              onBack={() => {
                setDismissedOffers([]);
                setFareNote("");
                setNegotiation(null);
              }}
            />
          ) : (
            <>
              {!destination ? (
                /* Collapsed Heetch box: one tap opens the full route editor. */
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setSearch("");
                    setSearchTarget("destination");
                  }}
                  style={styles.collapsedSearch}
                >
                  <Text style={styles.collapsedTitle}>
                    {tr(messages, "home.whereTo")}
                  </Text>
                  <View style={styles.collapsedField}>
                    <View style={styles.routeSquare} />
                    <Text style={styles.collapsedFieldText}>
                      {tr(messages, "home.enterDestination")}
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <>
                  {/* Full route: pickup, optional stops, destination. */}
                  <Pressable
                    onPress={() => {
                      setSearch("");
                      setSearchTarget("pickup");
                    }}
                    style={styles.locationRow}
                  >
                    <View style={styles.routeDot} />
                    <View style={styles.flex}>
                      <Text style={styles.label}>
                        {tr(messages, "home.pickup")}
                      </Text>
                      <Text numberOfLines={1} style={styles.locationText}>
                        {pickup.address ?? tr(messages, "home.currentLocation")}
                      </Text>
                    </View>
                    <Text style={styles.editIcon}>{"\u270E"}</Text>
                  </Pressable>
                  {stops.map((stop, index) =>
                    stop ? (
                      <Pressable
                        key={`stop-row-${index}`}
                        onPress={() => {
                          setSearch("");
                          setSearchTarget(stopTarget(index));
                        }}
                        style={styles.locationRow}
                      >
                        <View style={styles.routeStopDot} />
                        <View style={styles.flex}>
                          <Text style={styles.label}>
                            {tr(messages, "home.stop")}
                          </Text>
                          <Text numberOfLines={1} style={styles.locationText}>
                            {stop.address ?? tr(messages, "home.stop")}
                          </Text>
                        </View>
                        <Text style={styles.editIcon}>{"\u270E"}</Text>
                      </Pressable>
                    ) : null,
                  )}
                  <View style={styles.divider} />
                  <Pressable
                    onPress={() => {
                      setSearch("");
                      setSearchTarget("destination");
                    }}
                    style={styles.locationRow}
                  >
                    <View style={styles.routeSquare} />
                    <View style={styles.flex}>
                      <Text style={styles.label}>
                        {tr(messages, "home.destination")}
                      </Text>
                      <Text numberOfLines={1} style={styles.locationText}>
                        {destination.address ??
                          tr(messages, "home.destinationHint")}
                      </Text>
                    </View>
                    <Text style={styles.editIcon}>{"\u270E"}</Text>
                  </Pressable>
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
                        styles={styles}
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
                    <ActivityIndicator color={palette.text} />
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
                        {(paymentMethods.data ?? [])
                          .filter(
                            (item) =>
                              item.method !== "WALLET" || selected.supportsWallet,
                          )
                          .map((item) => (
                            <Pressable
                              key={`${item.method}:${item.provider ?? ""}`}
                              onPress={() => setPayment(item.method)}
                              style={[
                                styles.chip,
                                payment === item.method && styles.chipActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  payment === item.method && styles.chipTextActive,
                                ]}
                              >
                                {tr(messages, item.labelKey)}
                              </Text>
                            </Pressable>
                          ))}
                      </View>
                      <Pressable
                        disabled={requestMutation.isPending || !payment}
                        onPress={() => requestMutation.mutate()}
                        style={styles.primaryButton}
                      >
                        {requestMutation.isPending ? (
                          <ActivityIndicator color={palette.onPrimary} />
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
            </>
          )}
        </Animated.View>
      ) : null}

      {trip ? (
        <TripPanel
          styles={styles}
          palette={palette}
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

type Styles = ReturnType<typeof makeStyles>;

function VehicleCard({
  styles,
  vehicle,
  locale,
  selected,
  revision,
  messages,
  onPress,
}: {
  styles: Styles;
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
        <Image
          source={classArt(vehicle.rideClass)}
          resizeMode="contain"
          accessibilityLabel={tr(
            messages,
            assetFallbackByClass[vehicle.rideClass] ?? "",
          )}
          style={styles.vehicleImage}
        />
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
// Accept button that visually drains as the offer expires: a solid fill
// shrinks from full width to zero, and a clipped light label keeps the text
// readable on both the filled and the empty part of the button.
function AcceptButton({
  styles,
  label,
  expiresAt,
  onPress,
}: {
  styles: Styles;
  label: string;
  expiresAt?: string;
  onPress: () => void;
}) {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(1);
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      progress.value = 1;
      setSeconds(null);
      return;
    }
    const target = new Date(expiresAt).getTime();
    const left = () => Math.max(0, target - Date.now());
    const total = Math.max(1, left());
    progress.value = 1;
    progress.value = withTiming(0, { duration: total, easing: Easing.linear });
    setSeconds(Math.ceil(total / 1000));
    const timer = setInterval(
      () => setSeconds(Math.ceil(left() / 1000)),
      500,
    );
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const fill = useAnimatedStyle(() => ({
    width: width * progress.value,
  }));
  const text = seconds != null ? `${label}  ·  ${seconds}` : label;

  return (
    <Pressable
      onPress={onPress}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.acceptButton}
    >
      {/* empty-state label (dark text on the drained track) */}
      <Text style={styles.acceptTextIdle}>{text}</Text>
      {/* draining fill + the same label clipped inside it */}
      <Animated.View style={[styles.acceptFill, fill]}>
        <View style={[styles.acceptFillInner, { width: width || undefined }]}>
          <Text style={styles.acceptTextActive}>{text}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// inDrive-style bargaining: the passenger names a price, adds an optional
// message for drivers, and answers every driver offer with accept or dismiss.
function NegotiationPanel({
  styles,
  messages,
  proposed,
  placeholderColor,
  setProposed,
  note,
  setNote,
  palette,
  suggested,
  offers,
  onSend,
  onAccept,
  onDismiss,
  onBack,
}: {
  styles: Styles;
  messages: Record<string, string>;
  proposed: string;
  placeholderColor: string;
  setProposed: (x: string) => void;
  note: string;
  setNote: (x: string) => void;
  palette: Palette;
  suggested?: number;
  offers: FareOffer[];
  onSend: () => void;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onBack: () => void;
}) {
  const value = Number(proposed);
  const canSend = Number.isFinite(value) && value > 0;
  // Cheapest first, exactly like inDrive's offer list.
  const sorted = [...offers].sort((a, b) => a.fare - b.fare);
  return (
    <Animated.View entering={FadeIn}>
      <Text style={styles.sheetTitle}>
        {tr(messages, "home.negotiationTitle")}
      </Text>
      <Text style={styles.muted}>{tr(messages, "home.negotiationHint")}</Text>

      {/* price, typed directly */}
      <TextInput
        value={proposed}
        onChangeText={setProposed}
        keyboardType="decimal-pad"
        placeholder={suggested != null ? String(suggested) : undefined}
        placeholderTextColor={placeholderColor}
        style={styles.fareInput}
      />
      {suggested != null ? (
        <Text style={styles.muted}>
          {`${tr(messages, "home.suggestedFare")}: ${suggested}`}
        </Text>
      ) : null}

      {/* message shown to drivers with the price */}
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={tr(messages, "home.messagePlaceholder")}
        placeholderTextColor={placeholderColor}
        multiline
        maxLength={140}
        style={styles.noteInput}
      />

      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={[styles.primaryButton, !canSend && styles.disabled]}
      >
        <Text style={styles.buttonTextLight}>
          {tr(messages, "home.sendOffer")}
        </Text>
      </Pressable>

      <Text style={[styles.label, { marginTop: 16 }]}>
        {`${tr(messages, "home.driverOffers")}${sorted.length ? ` (${sorted.length})` : ""}`}
      </Text>
      {sorted.length ? (
        sorted.map((offer, index) => (
          <View key={offer.id} style={styles.offerCard}>
            <View style={styles.offerHead}>
              <View style={styles.flex}>
                <Text style={styles.vehicleName}>
                  {offer.driver?.name ?? tr(messages, "home.driver")}
                </Text>
                {offer.driver?.rating != null ? (
                  <Text style={styles.muted}>{`★ ${offer.driver.rating}`}</Text>
                ) : null}
              </View>
              <View style={styles.offerPriceBox}>
                <Text style={styles.price}>{offer.fare}</Text>
                {index === 0 && sorted.length > 1 ? (
                  <Text style={styles.bestBadge}>
                    {tr(messages, "home.bestPrice")}
                  </Text>
                ) : null}
              </View>
            </View>
            {offer.note ? (
              <Text style={styles.offerNote}>{offer.note}</Text>
            ) : null}
            {offer.etaMinutes != null ? (
              <Text style={styles.muted}>
                {`${tr(messages, "home.etaMinutes")}: ${offer.etaMinutes}`}
              </Text>
            ) : null}
            <View style={styles.offerActions}>
              <AcceptButton
                styles={styles}
                label={tr(messages, "home.acceptOffer")}
                expiresAt={offer.expiresAt}
                onPress={() => onAccept(offer.id)}
              />
              <Pressable
                onPress={() => onDismiss(offer.id)}
                style={styles.dismissButton}
              >
                <Text style={styles.dismissText}>
                  {tr(messages, "home.dismissOffer")}
                </Text>
              </Pressable>
            </View>
          </View>
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
  styles,
  palette,
  trip,
  messages,
  payment,
  cancelPending,
  onCancel,
  onCommunicate,
  onClose,
}: {
  styles: Styles;
  palette: Palette;
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
        <Detail
          styles={styles}
          label={tr(messages, "home.from")}
          value={trip.pickupAddress}
        />
        <Detail
          styles={styles}
          label={tr(messages, "home.to")}
          value={trip.destAddress}
        />
        {trip.vehicle ? (
          <Detail
            styles={styles}
            label={tr(messages, "home.vehicle")}
            value={[trip.vehicle.make, trip.vehicle.model, trip.vehicle.color]
              .filter(Boolean)
              .join(" ")}
          />
        ) : null}
        {trip.vehicle?.plate ? (
          <Detail
            styles={styles}
            label={tr(messages, "home.plate")}
            value={trip.vehicle.plate}
          />
        ) : null}
        <Detail
          styles={styles}
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
            <ActivityIndicator color={palette.text} />
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
function Detail({
  styles,
  label,
  value,
}: {
  styles: Styles;
  label: string;
  value?: string;
}) {
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

// Every colour below comes from the active palette — no literal hex values.
function makeStyles(palette: Palette, themeName: "light" | "dark") {
  const overlay = overlayFor(themeName);
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    center: {
      flex: 1,
      backgroundColor: palette.bg,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
    },
    flex: { flex: 1 },
    floating: {
      position: "absolute",
      zIndex: 20,
      top: 54,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: overlay,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: "center",
      justifyContent: "center",
    },
    floatingLeft: { left: 16 },
    floatingRight: { right: 16 },
    floatingIcon: { color: palette.text, fontSize: 22, fontWeight: "800" },
    pinWrap: {
      position: "absolute",
      top: "42%",
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 10,
    },
    pinHead: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 4,
      borderColor: palette.primary,
      backgroundColor: palette.surface,
    },
    pinStem: { width: 2, height: 18, backgroundColor: palette.primary },
    locationRow: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    diamond: { width: 10, height: 10, transform: [{ rotate: "45deg" }] },
    editIcon: { color: palette.textMuted, fontSize: 16 },
    divider: { height: 1, backgroundColor: palette.border, marginLeft: 22 },
    label: { fontSize: 12, fontWeight: "700", color: palette.textMuted },
    locationText: {
      fontSize: 16,
      fontWeight: "700",
      color: palette.text,
      marginTop: 2,
    },
    muted: { fontSize: 14, color: palette.textMuted, lineHeight: 20 },
    searchSheet: {
      position: "absolute",
      top: 44,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: palette.bg,
      padding: 20,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: palette.border,
    },
    quickRow: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    quickIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: palette.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    quickIconText: { color: palette.textMuted, fontSize: 16 },
    suggestionList: { flex: 1, minHeight: 180 },
    routeEditor: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      paddingHorizontal: 14,
      marginTop: 14,
    },
    routeField: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    routeFieldActive: { borderBottomColor: palette.primary },
    routeInput: {
      height: 34,
      padding: 0,
      fontSize: 16,
      fontWeight: "700",
      color: palette.text,
    },
    routeDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: palette.primary,
    },
    routeStopDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: palette.primary,
      marginLeft: 1,
    },
    routeSquare: {
      width: 12,
      height: 12,
      borderRadius: 2,
      backgroundColor: palette.primary,
    },
    routeRemove: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surface,
    },
    addStop: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    addStopIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      textAlign: "center",
      lineHeight: 30,
      fontSize: 15,
      color: palette.onPrimary,
      backgroundColor: palette.primary,
      overflow: "hidden",
    },
    addStopText: { fontSize: 15, fontWeight: "700", color: palette.text },
    collapsedSearch: { paddingTop: 2 },
    collapsedTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: palette.text,
      letterSpacing: -0.4,
      marginBottom: 14,
    },
    collapsedField: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
    },
    collapsedFieldText: {
      fontSize: 17,
      fontWeight: "700",
      color: palette.textMuted,
    },
    stopMarker: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.onPrimary,
      borderWidth: 2,
      borderColor: palette.primary,
    },
    stopMarkerCore: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: palette.primary,
    },
    bottomSheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: "70%",
      backgroundColor: palette.surface,
      padding: 20,
      paddingBottom: 28,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: palette.border,
    },
    handle: {
      alignSelf: "center",
      width: 42,
      height: 5,
      borderRadius: 3,
      backgroundColor: palette.border,
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: palette.text,
      letterSpacing: -0.4,
      marginBottom: 6,
    },
    searchInput: {
      height: 56,
      borderRadius: 16,
      backgroundColor: palette.surfaceAlt,
      paddingHorizontal: 16,
      fontSize: 17,
      color: palette.text,
      marginVertical: 16,
    },
    suggestion: {
      minHeight: 64,
      justifyContent: "center",
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    vehicleList: { gap: 10, paddingVertical: 14 },
    vehicleCard: {
      width: 148,
      minHeight: 128,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 10,
      backgroundColor: palette.surface,
    },
    vehicleSelected: {
      borderWidth: 2,
      borderColor: palette.primary,
      backgroundColor: palette.surfaceAlt,
    },
    vehicleImage: { width: "100%", height: 72 },
    vehicleImageFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surfaceAlt,
      borderRadius: 10,
    },
    vehicleImageFallbackText: {
      fontSize: 12,
      color: palette.textMuted,
      fontWeight: "700",
    },
    vehicleName: { fontSize: 16, fontWeight: "800", color: palette.text },
    vehicleEta: { fontSize: 12, color: palette.textMuted, marginTop: 3 },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    price: { fontSize: 21, fontWeight: "900", color: palette.text },
    metaRow: { flexDirection: "row", gap: 12, marginTop: 4 },
    meta: { fontSize: 13, color: palette.textMuted },
    paymentRow: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
    chip: {
      minHeight: 42,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    chipActive: { borderColor: palette.primary, backgroundColor: palette.surfaceAlt },
    chipText: { color: palette.text, fontWeight: "700" },
    chipTextActive: { color: palette.text },
    primaryButton: {
      minHeight: 56,
      borderRadius: 16,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
    },
    secondaryButton: {
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
    },
    buttonTextLight: { fontSize: 16, fontWeight: "800", color: palette.onPrimary },
    buttonTextDark: { fontSize: 16, fontWeight: "800", color: palette.text },
    fareInput: {
      height: 58,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      fontSize: 24,
      fontWeight: "800",
      color: palette.text,
      backgroundColor: palette.surfaceAlt,
      marginTop: 14,
    },
    offerRow: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    accept: { fontSize: 13, fontWeight: "800", color: palette.accent },
    offerCard: {
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceAlt,
      borderRadius: 18,
      padding: 14,
      gap: 12,
      marginTop: 10,
    },
    offerHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    offerPriceBox: { alignItems: "flex-end", gap: 4 },
    offerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    acceptButton: {
      flex: 1,
      height: 50,
      borderRadius: 14,
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    acceptFill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: palette.primary,
      overflow: "hidden",
    },
    acceptFillInner: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    acceptTextIdle: { fontSize: 15, fontWeight: "800", color: palette.text },
    acceptTextActive: {
      fontSize: 15,
      fontWeight: "800",
      color: palette.onPrimary,
    },
    offerNote: {
      fontSize: 14,
      color: palette.text,
      marginTop: 8,
      lineHeight: 20,
    },
    noteInput: {
      minHeight: 58,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      fontSize: 15,
      color: palette.text,
      backgroundColor: palette.surfaceAlt,
      marginTop: 10,
      textAlignVertical: "top",
    },
    vehicleMarker: { width: 34, height: 68 },
    pickupMarker: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: palette.onPrimary,
      borderWidth: 3,
      borderColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    pickupMarkerCore: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: palette.primary,
    },
    destinationMarker: {
      width: 26,
      height: 26,
      borderRadius: 7,
      backgroundColor: palette.onPrimary,
      borderWidth: 3,
      borderColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    destinationMarkerCore: {
      width: 10,
      height: 10,
      borderRadius: 2,
      backgroundColor: palette.primary,
    },
    locationArt: { width: 220, height: 220, marginBottom: 8 },
    locationTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "800",
      textAlign: "center",
      paddingHorizontal: 28,
    },
    locationPrimary: {
      minHeight: 54,
      paddingHorizontal: 28,
      borderRadius: 27,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    locationPrimaryText: {
      color: palette.onPrimary,
      fontSize: 16,
      fontWeight: "800",
    },
    locationSecondary: {
      minHeight: 46,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    locationSecondaryText: {
      color: palette.textMuted,
      fontSize: 14,
      fontWeight: "700",
    },
    exitHint: {
      position: "absolute",
      bottom: 34,
      alignSelf: "center",
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 22,
      backgroundColor: overlay,
      borderWidth: 1,
      borderColor: palette.border,
    },
    exitHintText: { color: palette.text, fontSize: 14, fontWeight: "700" },
    dismissButton: {
      height: 46,
      paddingHorizontal: 14,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    dismissText: { fontSize: 14, fontWeight: "700", color: palette.textMuted },
    bestBadge: {
      fontSize: 11,
      fontWeight: "800",
      color: palette.accent,
      letterSpacing: 0.6,
    },
    timer: { fontSize: 12, fontWeight: "700", color: palette.accent, marginTop: 2 },
    expired: { fontSize: 12, fontWeight: "700", color: palette.danger, marginTop: 2 },
    pulse: {
      width: 62,
      height: 62,
      borderRadius: 31,
      alignSelf: "center",
      backgroundColor: palette.accent,
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
      backgroundColor: palette.surfaceAlt,
      overflow: "hidden",
    },
    avatarImage: { width: "100%", height: "100%" },
    details: {
      borderRadius: 17,
      backgroundColor: palette.surfaceAlt,
      paddingHorizontal: 14,
    },
    detailRow: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    detailValue: {
      flex: 1,
      textAlign: "right",
      fontSize: 14,
      fontWeight: "700",
      color: palette.text,
    },
    disabled: { opacity: 0.35 },
  });
}
