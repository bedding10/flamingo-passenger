import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import MapView, { type Region } from "react-native-maps";
import * as Location from "expo-location";
import { useMutation } from "@tanstack/react-query";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import type {
  PlaceSuggestion,
  Point,
  VehicleType,
} from "../../core/contracts";
import { managedAsset, syncManagedAssets } from "../../core/assets";
import { tr } from "../../core/i18n";
import { useMessages } from "../../core/use-messages";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocaleStore } from "../../core/locale-store";
import { haversineDistance } from "../../core/geo";
import { reportError } from "../../core/observability";
import { useSession } from "../../core/session-store";
import {
  overlayFor,
  withAlpha,
  type Palette,
  mapStyleFor,
} from "../../core/theme";
import { RADIUS, SHADOW, SPACING, TYPE } from "../../core/design";
import { colors as brand, sheetSurfacesFor } from "../../design/theme";
import { PressScale } from "../../components/PressScale";
import { GoldButton } from "../../components/GoldButton";
import { a11yButton, a11yImage, a11yValue } from "../../core/a11y";
import { nextMode, useTheme } from "../../core/theme-store";
import { passengerApi } from "../trip/trip-api";
import RideMap from "./RideMap";
import { useUserLocation } from "./useUserLocation";
import { useRideQuote } from "./useRideQuote";
import { useTripLifecycle } from "./useTripLifecycle";
import { NegotiationPanel } from "./NegotiationPanel";
import { TripPanel } from "./TripPanel";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { passengerServicesApi } from "../../core/passenger-api";
import PickupPin from "../../components/map/PickupPin";
import DropoffPin from "../../components/map/DropoffPin";
import { PIN_HEIGHT } from "../../components/map/MapPinBase";
import MapFloatingButton from "../../components/map/MapFloatingButton";
import DestinationSheet, {
  type PlaceItem,
  type SheetStage,
} from "../../components/destination/DestinationSheet";
import RouteRows from "../../components/destination/RouteRows";
import SideDrawer, {
  type DrawerMenuKey,
} from "../../components/drawer/SideDrawer";
import {
  ChevronIcon,
  MenuIcon,
  TargetIcon,
} from "../../components/icons/Icons";

type SearchTarget = "pickup" | "destination" | `stop:${number}`;
// Intermediate stops are addressed as "stop:0", "stop:1", ... so a single
// search sheet can edit every point of the route.
const stopTarget = (index: number): SearchTarget => `stop:${index}`;
const stopIndexOf = (target: SearchTarget | null): number | null =>
  target && target.startsWith("stop:") ? Number(target.slice(5)) : null;
// Bundled 3D class artwork (used until the dashboard ships its own image for
// a class). Local files draw instantly, with no network round trip.
const CLASS_ART: Record<string, number> = {
  ECONOMY: require("../../../assets/class-economy.webp"),
  COMFORT: require("../../../assets/class-comfort.webp"),
  SEDAN: require("../../../assets/class-comfort.webp"),
  PREMIUM: require("../../../assets/class-comfort.webp"),
  VAN: require("../../../assets/class-xl.webp"),
  XL: require("../../../assets/class-xl.webp"),
  BIKE: require("../../../assets/class-bike.webp"),
  MOTO: require("../../../assets/class-bike.webp"),
};
// Category artwork is matched on the category name first (dashboard names are
// free text), then on the ride class, so two categories never share a picture
// just because they were created with the same ride class.
const ART_KEYWORDS: Array<[RegExp, number]> = [
  [/(bike|moto|scooter|دراج)/i, CLASS_ART.BIKE],
  [/(xl|van|family|minibus|عائل|كبير)/i, CLASS_ART.XL],
  [
    /(comfort|premium|business|sedan|vip|lux|مريح|فاخر|أعمال)/i,
    CLASS_ART.COMFORT,
  ],
  [/(eco|economy|standard|اقتصاد|عاد)/i, CLASS_ART.ECONOMY],
];
const artForVehicle = (vehicle: {
  rideClass?: string;
  name?: string;
  nameI18n?: Record<string, string>;
  imageAssetKey?: string;
}) => {
  const haystack = [
    vehicle.name,
    vehicle.imageAssetKey,
    ...Object.values(vehicle.nameI18n ?? {}),
  ]
    .filter(Boolean)
    .join(" ");
  for (const [pattern, art] of ART_KEYWORDS)
    if (pattern.test(haystack)) return art;
  return (
    CLASS_ART[(vehicle.rideClass ?? "").toUpperCase()] ?? CLASS_ART.ECONOMY
  );
};
// Illustration shown while the app is asking for (or missing) the location.
const LOCATION_ART = require("../../../assets/illustration-location.webp");
// Algiers city centre: last-resort region so the map is never blank.
const FALLBACK_POINT = { lat: 36.7538, lng: 3.0588 };
// Matches the backend limit (ArrayMaxSize(3) on RequestRideDto.stops).
const MAX_STOPS = 3;

// Below this the pickup and the device are "the same place", and the gold pin
// would just sit on top of the blue location dot.
const SAME_PLACE_M = 30;

// Frames of the travelling light that runs along the gold route line.
const ROUTE_STEPS = 60;
const assetFallbackByClass: Record<string, string> = {
  ECONOMY: "vehicle.category.economy",
  COMFORT: "vehicle.category.comfort",
  VAN: "vehicle.category.family",
  XL: "vehicle.category.family",
  BIKE: "vehicle.category.bike",
};

// ---------------------------------------------------------------------------
// flaminGO map pin (gold) — replaces the old grey dot / square markers.
//
// One shared geometry for both pins so pickup and drop-off are pixel identical:
// gold circular head, black glyph inside, long gold stem, gold speech bubble
// on top. While the map is being dragged a detached gold dot is shown under the
// stem; once the point is snapped to the road the dot disappears.
//
// Pure UI: the pin never touches the map, geocoding or snapping logic.
// ---------------------------------------------------------------------------

export function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Home">) {
  const profile = useSession((s) => s.profile);
  const { palette, name: themeName, setMode } = useTheme();
  const styles = useMemo(
    () => makeStyles(palette, themeName),
    [palette, themeName],
  );
  const insets = useSafeAreaInsets();
  const map = useRef<MapView>(null);
  // The persisted app language. It is the ONE source of truth for the UI
  // language: the server profile is only a mirror of it.
  // نمط الترجمة الموحّد: نفس المخزن الذي تستخدمه بقية الشاشات.
  const { locale, messages } = useMessages();
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
  // True while the map is moving under the centre pin: shows the detached gold
  // dot and hides it again as soon as the point is snapped to the road.
  const [pinDragging, setPinDragging] = useState(false);
  // Drawer + bottom-sheet position are pure presentation state: the map hides
  // its floating controls while the sheet is expanded, exactly like Heetch.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pinRegion = useRef<Region | null>(null);
  const [assetRevision, setAssetRevision] = useState(0);

  // ── Extracted state machines ──────────────────────────────────────────
  // The live ride: server state, the safety-net poll, the realtime socket and
  // the animated driver marker. Same events, same endpoints as before.
  const { trip, setTrip, matchFailure, setMatchFailure, driverCoordinate } =
    useTripLifecycle();
  // Catalog, suggestions, route, quote, payment and fare negotiation. The
  // names below are unchanged, so every consumer in this file still reads the
  // same variables it always did.
  const {
    paymentMethods,
    suggestions,
    offers,
    route,
    vehicles,
    selected,
    setSelected,
    quote,
    setQuote,
    payment,
    setPayment,
    negotiation,
    setNegotiation,
    proposedFare,
    setProposedFare,
    dismissedOffers,
    setDismissedOffers,
    fareNote,
    setFareNote,
    quoteMutation,
    requestMutation,
    startNegotiation,
  } = useRideQuote({
    pickup,
    destination,
    stops,
    search,
    searchTarget,
    onTripCreated: setTrip,
  });
  // ── Where the passenger is ───────────────────────────────────────────────
  // The device fix only ever SEEDS an empty pickup; it never overwrites a
  // point the passenger already chose. Exactly the previous rule, moved.
  const seedPickup = useCallback((point: Point) => {
    setPickup((prev) => prev ?? point);
  }, []);
  const {
    deviceLocation,
    locationDenied,
    isFarFromMe,
    requestLocation,
    readCurrentPoint,
    syncCameraDistance,
  } = useUserLocation({
    // Full GPS accuracy is spent only while the pickup is still undecided.
    precise: pickup == null || pinMode === "pickup",
    onFix: seedPickup,
  });

  useEffect(() => {
    syncManagedAssets()
      .then(() => setAssetRevision((x) => x + 1))
      .catch((e) => reportError(e, "home.assets"));
    void requestLocation();
  }, [requestLocation]);

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

  const applyPoint = useCallback((target: SearchTarget, point: Point) => {
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
  }, []);

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

  // Plain async helper, NOT a hook. It was previously named `useDeviceLocation`,
  // which made React and the rules-of-hooks lint rule treat a call made inside a
  // JSX callback as a conditional hook call.
  const applyDeviceLocation = async () => {
    const target = searchTarget ?? "pickup";
    let point = deviceLocation;
    if (!point) {
      // Full accuracy only when this fix becomes the pickup point.
      point = await readCurrentPoint(target === "pickup");
      if (!point) return;
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
      // Recentre affordance: measured on every settled camera, independent of
      // pin mode. 80 m is roughly "a different block", small enough to feel
      // responsive and large enough to ignore GPS jitter.
      syncCameraDistance({ lat: region.latitude, lng: region.longitude });
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
        } finally {
          // Snapped state: detached dot disappears, bubble stays.
          setPinDragging(false);
        }
      })();
    },
    [syncCameraDistance, pinMode],
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
    setPinDragging(false);
  };

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!trip) return;
      await passengerApi.cancelRide(trip.id);
      resetRide();
    },
  });
  // Cancelling used to fire on the first tap with no confirmation, so a
  // mis-tap during a ride cancelled it outright. D-7: the warning text now
  // comes from the SERVER (/rides/:id/cancel-preview), which knows the trip
  // state and the repeated-cancellation policy. There is NO passenger
  // cancellation fee any more, so no money is ever mentioned here; the risk is
  // that repeated cancellations can freeze the account. If the preview call
  // fails we fall back to the local text and still allow the cancellation -
  // never block a passenger from cancelling because of a failed advisory call.
  const confirmCancel = useCallback(async () => {
    let title = tr(messages, "home.cancelConfirm.title");
    let body = tr(messages, "home.cancelConfirm.body");
    if (trip) {
      try {
        const preview = await passengerApi.cancelPreview(trip.id);
        if (preview?.title) title = preview.title;
        if (preview?.message) body = preview.message;
      } catch (e) {
        reportError(e, "home.cancelPreview");
      }
    }
    Alert.alert(title, body, [
      { text: tr(messages, "common.back"), style: "cancel" },
      {
        text: tr(messages, "home.cancelRide"),
        style: "destructive",
        onPress: () => cancelMutation.mutate(),
      },
    ]);
  }, [cancelMutation, messages, trip]);
  // SOS. The client is deliberately dumb here: it sends the trip id and the
  // last known position, and the SERVER is what decides whether this trip
  // belongs to this passenger. `deviceLocation` can be null (permission
  // refused), and the report still goes out without coordinates - a report
  // with no position beats no report at all.
  const sosMutation = useMutation({
    mutationFn: async () => {
      const point = deviceLocation ?? (await readCurrentPoint(true));
      return passengerServicesApi.reportSafetyIncident({
        tripId: trip?.id,
        lat: point?.lat,
        lng: point?.lng,
        type: "SOS",
      });
    },
    onSuccess: () => Alert.alert(tr(messages, "safety.sent")),
    onError: (e) => {
      reportError(e, "home.sos");
      Alert.alert(tr(messages, "safety.error"));
    },
  });
  const confirmSos = useCallback(() => {
    Alert.alert(
      tr(messages, "safety.confirmTitle"),
      tr(messages, "safety.confirmBody"),
      [
        { text: tr(messages, "safety.back"), style: "cancel" },
        {
          text: tr(messages, "safety.confirmSend"),
          style: "destructive",
          onPress: () => sosMutation.mutate(),
        },
      ],
    );
  }, [sosMutation, messages]);
  // "No driver found" must be recoverable without retyping the trip. Cancels
  // the exhausted ride server-side, then re-sends the SAME request with the
  // route and vehicle the passenger already chose. Existing endpoints only.
  const retryMatchMutation = useMutation({
    mutationFn: async () => {
      const previous = trip;
      setMatchFailure(null);
      setTrip(null);
      if (previous) {
        await passengerApi.cancelRide(previous.id).catch(() => undefined);
      }
      await requestMutation.mutateAsync();
    },
  });
  const resetRide = () => {
    setTrip(null);
    setMatchFailure(null);
    setNegotiation(null);
    setSelected(null);
    setQuote(null);
    setDestination(null);
    setProposedFare("");
  };

  // Map style is memoised so the map never re-renders because of a new array.
  // onRegionChange fires on EVERY frame of a pan/zoom (~60x per second). An
  // inline arrow here allocated a new prop on each render and re-entered React
  // state on every frame; a stable callback that early-returns once dragging is
  // latched keeps the gesture on the native thread.
  const onRegionChange = useCallback(() => {
    if (pinMode && !pinDragging) setPinDragging(true);
  }, [pinMode, pinDragging]);

  const mapStyle = useMemo(
    () => mapStyleFor(palette.mapStyle),
    [palette.mapStyle],
  );

  // Travelling light: the animated slice now lives inside <RouteComet/>, a
  // leaf component. Its 90ms tick used to re-render this whole screen about
  // eleven times a second; it is now scoped to two polylines.

  // Back button: every open surface is closed one level at a time, and only a
  // truly idle screen falls through to the two-press exit.
  const [exitHint, setExitHint] = useState(false);
  const lastBackPress = useRef(0);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // 1. the drawer sits above everything else
        if (drawerOpen) {
          setDrawerOpen(false);
          return true;
        }
        // 2. the fare negotiation panel
        if (negotiation) {
          setNegotiation(null);
          setDismissedOffers([]);
          setFareNote("");
          return true;
        }
        // 3. manual point picking on the map
        if (pinMode) {
          setPinMode(null);
          setPinDragging(false);
          setPinAddress("");
          return true;
        }
        // 4. the search stage of the sheet
        if (searchTarget) {
          setSearchTarget(null);
          setSearch("");
          setStops((current) => current.filter((stop) => !!stop));
          return true;
        }
        // 5. a confirmed route: drop it and go back to the gold banner
        if (destination) {
          resetRide();
          return true;
        }
        // 6. nothing is open: two presses leave the app
        const now = Date.now();
        if (now - lastBackPress.current < 2000) return false;
        lastBackPress.current = now;
        setExitHint(true);
        setTimeout(() => setExitHint(false), 2000);
        return true;
      },
    );
    return () => subscription.remove();
  }, [drawerOpen, negotiation, pinMode, searchTarget, destination]);

  // Suggestions are mapped 1:1 to sheet rows; the id is the index so the row
  // can be resolved back to the untouched API result on selection.
  // NOTE: this hook MUST stay above the `if (!pickup)` early return below.
  // While the device location is still resolving, `pickup` is null and the
  // screen returns early; any hook placed after that return is skipped on the
  // first renders and then executed once the location arrives, which is the
  // exact cause of "Rendered more hooks than during the previous render.".
  const placeItems: PlaceItem[] = useMemo(
    () =>
      (suggestions.data ?? []).map((item, index) => ({
        id: String(index),
        title: String(
          item.address ?? item.description ?? item.label ?? item.name ?? "",
        ),
        subtitle:
          item.description && item.address
            ? String(item.description)
            : undefined,
        kind: "suggestion" as const,
      })),
    [suggestions.data],
  );

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
  // Drops the slots the passenger opened but never filled.
  const pruneStops = () =>
    setStops((current) => current.filter((stop) => !!stop));
  const closeSearch = () => {
    setSearchTarget(null);
    setSearch("");
    pruneStops();
  };
  // ---------------------------------------------------------------------
  // Derived, NON-hook values. They deliberately live below the `if (!pickup)`
  // early return: adding a hook here would change the hook order between the
  // "waiting for location" render and the map render ("Rendered more hooks
  // than during the previous render").
  // ---------------------------------------------------------------------
  // The sheet follows the APP theme, the map keeps Google light/dark.
  const mapTheme: "light" | "dark" = themeName === "dark" ? "dark" : "light";
  const sheetSurfaces = sheetSurfacesFor(mapTheme);
  // ONE sheet, one stage at a time: an active trip wins, then map-pin picking,
  // then the search, then the ride picker, and finally the idle headline.
  const sheetStage: SheetStage = trip
    ? "trip"
    : pinMode
      ? "pin"
      : searchOpen
        ? "search"
        : destination
          ? "ride"
          : "idle";
  // Filled stops shown inside the sheet's route rail.
  const stopRows = stops.flatMap((stop, index) =>
    stop
      ? [
          {
            key: `stop-${index}`,
            label: stop.address ?? tr(messages, "home.stop"),
            onPress: () => {
              setSearch("");
              setSearchTarget(stopTarget(index));
            },
          },
        ]
      : [],
  );
  // Gold "+" next to the pickup row: opens a new stop slot for editing.
  const addStop = () => {
    if (stops.length >= MAX_STOPS) return;
    setStops((current) => [...current, null]);
    setSearch("");
    setSearchTarget(stopTarget(stops.length));
  };
  // "My location": brings the camera back onto the passenger. isFarFromMe
  // clears itself from onRegionChangeComplete once the animation settles.
  const locateMe = () => {
    const point = deviceLocation ?? pickup;
    map.current?.animateCamera(
      { center: { latitude: point.lat, longitude: point.lng }, zoom: 16 },
      { duration: 450 },
    );
  };
  // Sits just ABOVE the collapsed sheet (26% of the screen height) with a
  // small breathing gap, exactly like the reference screen: bottom-left,
  // hovering right over the gold card rather than floating mid-map.
  const locationButtonBottom =
    Math.round(Dimensions.get("window").height * 0.26) + SPACING.sm;
  // "My location" is already drawn by the map as a translucent blue disc, so
  // the gold pin is only worth drawing when the pickup is somewhere ELSE.
  const showPickupPin =
    pinMode === "pickup" ||
    !deviceLocation ||
    haversineDistance(pickup, deviceLocation) > SAME_PLACE_M;

  // A quote exists only for the class the passenger tapped, so the price is
  // rendered on that card alone (VehicleType carries no base fare).
  const priceForVehicle = (vehicle: VehicleType) =>
    quote && selected?.id === vehicle.id
      ? `${String(quote.fare ?? quote.total ?? quote.amount ?? "")} ${
          quote.currency ?? vehicle.resolvedPricing?.currency ?? ""
        }`.trim()
      : undefined;

  return (
    <View style={styles.root}>
      {/* The map is its own memoised leaf: typing a fare, opening the
          drawer or moving the sheet no longer re-renders it. */}
      <RideMap
        mapRef={map}
        mapStyle={mapStyle}
        styles={styles}
        palette={palette}
        messages={messages}
        pickup={pickup}
        destination={destination}
        stops={stops}
        showPickupPin={showPickupPin}
        pinMode={pinMode}
        pinDragging={pinDragging}
        driverVisible={driverVisible}
        driverCoordinate={driverCoordinate}
        driverHeading={Number(trip?.heading ?? 0)}
        driverRideClass={
          (trip?.rideClass as string | undefined) ?? selected?.rideClass
        }
        routePoints={route.data}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
      />

      {/* Top-RIGHT: the ONLY control at the top. Circular, white by day and
          black by night, with a gold hamburger. Offset from the real safe
          area so it never touches the status bar or the screen edge. */}
      <MapFloatingButton
        mapTheme={mapTheme}
        hidden={sheetOpen}
        side="end"
        top={insets.top + SPACING.md}
        accessibilityLabel={tr(messages, "menu.title")}
        onPress={() => setDrawerOpen(true)}
      >
        <MenuIcon size={22} color={brand.gold} />
      </MapFloatingButton>

      {/* Bottom-right: the "recentre on me" button. Same surface as the menu
          button (no solid gold), and only present once the camera has drifted
          away from the passenger. */}
      <MapFloatingButton
        mapTheme={mapTheme}
        hidden={sheetOpen || !isFarFromMe}
        side="start"
        bottom={locationButtonBottom}
        accessibilityLabel={tr(messages, "destination.current")}
        onPress={locateMe}
      >
        <TargetIcon size={22} color={brand.gold} />
      </MapFloatingButton>

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

      {/* Centre pin: drag the map to place the active point. Detached gold dot
          while dragging, dot removed once the point snaps to the road. */}
      {pinMode ? (
        <View pointerEvents="none" style={styles.pinWrap}>
          {pinMode === "pickup" ? (
            <PickupPin
              label={tr(messages, "home.pickupHere")}
              state={pinDragging ? "dragging" : "snapped"}
            />
          ) : (
            <DropoffPin
              label={tr(messages, "home.dropoffHere")}
              state={pinDragging ? "dragging" : "snapped"}
            />
          )}
        </View>
      ) : null}

      {/* ── THE single bottom sheet ──────────────────────────────────
          One instance for the whole journey: idle → search → ride → trip,
          plus the map-pin confirmation. No sheet is ever stacked on another;
          only the content and the height of THIS sheet change. */}
      <DestinationSheet
        mode={mapTheme}
        stage={sheetStage}
        onRequestSearch={() => {
          setSearch("");
          setSearchTarget(searchTarget ?? "destination");
        }}
        onCloseSearch={closeSearch}
        query={search}
        onChangeQuery={setSearch}
        searching={suggestions.isFetching}
        suggestions={placeItems}
        pickupLabel={pickup.address ?? tr(messages, "home.currentLocation")}
        destinationLabel={destination?.address ?? ""}
        activeTarget={searchTarget === "pickup" ? "pickup" : "destination"}
        onChangeTarget={(target) => {
          setSearch("");
          setSearchTarget(target);
        }}
        onSelectPlace={(item: PlaceItem) => {
          const source = (suggestions.data ?? [])[Number(item.id)];
          if (source) void choosePlace(source);
        }}
        onUseCurrentLocation={() => void applyDeviceLocation()}
        onSetOnMap={() => {
          setPinMode(searchTarget ?? "destination");
          closeSearch();
        }}
        onAddStop={stops.length < MAX_STOPS ? addStop : undefined}
        stops={stopRows}
        routeReady={!!pickup && !!destination}
        onSnapChange={(index) => setSheetOpen(index > 0)}
      >
        {sheetStage === "pin" ? (
          <View style={styles.sheetBody}>
            <Text style={styles.sheetTitle}>
              {tr(
                messages,
                pinMode === "pickup"
                  ? "home.choosePickup"
                  : "home.chooseDestination",
              )}
            </Text>
            <Text numberOfLines={2} style={styles.locationText}>
              {pinAddress || tr(messages, "home.dragMap")}
            </Text>
            <View style={styles.ctaWrap}>
              <GoldButton
                label={tr(messages, "home.confirmPoint")}
                onPress={confirmPin}
              />
            </View>
            <Pressable
              onPress={() => {
                setPinMode(null);
                setPinAddress("");
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.buttonTextDark}>
                {tr(messages, "common.cancel")}
              </Text>
            </Pressable>
          </View>
        ) : sheetStage === "trip" && trip ? (
          <TripPanel
            styles={styles}
            palette={palette}
            trip={trip}
            messages={messages}
            payment={payment}
            cancelPending={cancelMutation.isPending}
            onCancel={confirmCancel}
            failure={matchFailure}
            retryPending={retryMatchMutation.isPending}
            onRetry={() => retryMatchMutation.mutate()}
            onCommunicate={() =>
              navigation.navigate("TripCommunication", { tripId: trip.id })
            }
            onSos={confirmSos}
            onClose={resetRide}
          />
        ) : sheetStage === "ride" && destination ? (
          negotiation ? (
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
            <View style={styles.sheetBody}>
              {/* Visible way back: the hardware button is not the only exit. */}
              <Pressable
                onPress={resetRide}
                hitSlop={12}
                style={styles.backButton}
                {...a11yButton(tr(messages, "common.back"))}
              >
                <ChevronIcon size={22} color={brand.gold} direction="right" />
              </Pressable>
              {/* Pickup / stops / destination, then the ride picker. */}
              <RouteRows
                surfaces={sheetSurfaces}
                pickupLabel={
                  pickup.address ?? tr(messages, "home.currentLocation")
                }
                pickupPlaceholder={tr(messages, "destination.pickup")}
                destinationLabel={destination.address ?? ""}
                destinationPlaceholder={tr(messages, "destination.dropoff")}
                onPressPickup={() => {
                  setSearch("");
                  setSearchTarget("pickup");
                }}
                onPressDestination={() => {
                  setSearch("");
                  setSearchTarget("destination");
                }}
                onAddStop={stops.length < MAX_STOPS ? addStop : undefined}
                addStopLabel={tr(messages, "destination.addStop")}
                stops={stopRows}
              />
              <Text style={styles.sheetTitle}>
                {tr(messages, "home.chooseRide")}
              </Text>
              {/* A plain ScrollView nested in a bottom sheet loses its touches
                  to the sheet's gesture handler: the cards become dead. The
                  sheet's own scroll view is the only one that cooperates. */}
              <BottomSheetScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.vehicleList}
              >
                {vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    styles={styles}
                    vehicle={vehicle}
                    locale={locale}
                    selected={selected?.id === vehicle.id}
                    revision={assetRevision}
                    messages={messages}
                    price={priceForVehicle(vehicle)}
                    badge={
                      fastestVehicleId(vehicles) === vehicle.id
                        ? tr(messages, "home.fastest")
                        : undefined
                    }
                    onPress={() => quoteMutation.mutate(vehicle)}
                  />
                ))}
              </BottomSheetScrollView>
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
                  {/* Wide, gold, large-cornered request button. */}
                  <View style={styles.ctaWrap}>
                    <GoldButton
                      label={tr(messages, "home.requestRide")}
                      loading={requestMutation.isPending}
                      disabled={!payment}
                      onPress={() => requestMutation.mutate()}
                    />
                  </View>
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
            </View>
          )
        ) : null}
      </DestinationSheet>

      {/* flaminGO drawer: profile card, five entries, languages + theme. */}
      <SideDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mapTheme={themeName === "dark" ? "dark" : "light"}
        userName={profile?.name ?? ""}
        avatarUrl={profile?.avatarUrl}
        frameUrl={profile?.profileFrameUrl}
        tripCount={Number(
          profile?.completedTripsCount ?? profile?.tripCount ?? 0,
        )}
        rating={Number(profile?.rating ?? 0)}
        activeLocale={locale as "ar" | "fr" | "en"}
        onSelect={(key: DrawerMenuKey) => {
          setDrawerOpen(false);
          if (key === "account") navigation.navigate("Profile");
          else if (key === "wallet") navigation.navigate("Wallet");
          else if (key === "trips") navigation.navigate("Trips");
          else if (key === "coupons") navigation.navigate("Coupons");
          else navigation.navigate("Support");
        }}
        onChangeLocale={(next) => {
          // 1. Local, persisted, instant: this is what actually changes the UI
          //    language and survives a cold start (MMKV).
          void useLocaleStore.getState().setLocale(next);
          // 2. Best effort: keep the server profile in sync. A failure here
          //    must never undo the switch the passenger just made.
          void passengerServicesApi
            .updateProfile({ locale: next })
            .then((updated) => useSession.setState({ profile: updated }))
            .catch((error) => reportError(error, "drawer.locale"));
        }}
        onToggleTheme={() => setMode(nextMode(themeName))}
        labels={{
          account: tr(messages, "drawer.account"),
          wallet: tr(messages, "drawer.wallet"),
          trips: tr(messages, "drawer.trips"),
          coupons: tr(messages, "drawer.coupons"),
          help: tr(messages, "drawer.help"),
        }}
      />
    </View>
  );
}

export type Styles = ReturnType<typeof makeStyles>;

// The class that can pick the passenger up first earns the gold badge. Pure
// and cheap, so it can run inline while rendering the horizontal list.
function fastestVehicleId(vehicles: VehicleType[]): string | null {
  let best: VehicleType | null = null;
  for (const vehicle of vehicles) {
    if (vehicle.etaMinutes == null) continue;
    if (!best || vehicle.etaMinutes < (best.etaMinutes ?? Infinity))
      best = vehicle;
  }
  return best?.id ?? null;
}

function VehicleCardBase({
  styles,
  vehicle,
  locale,
  selected,
  revision,
  messages,
  badge,
  price,
  onPress,
}: {
  styles: Styles;
  vehicle: VehicleType;
  locale: string;
  selected: boolean;
  revision: number;
  messages: Record<string, string>;
  badge?: string;
  /** Quote for this class, when the passenger already picked it. */
  price?: string;
  onPress: () => void;
}) {
  const key = vehicle.imageAssetKey;
  const asset = key ? managedAsset(key) : null;
  return (
    <Pressable
      {...a11yButton(
        [
          vehicle.nameI18n?.[locale] ?? vehicle.name,
          vehicle.capacity
            ? `${vehicle.capacity} ${tr(messages, "home.capacity")}`
            : "",
          vehicle.etaMinutes != null
            ? `${vehicle.etaMinutes} ${tr(messages, "home.eta")}`
            : "",
        ]
          .filter(Boolean)
          .join(", "),
        { selected },
      )}
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
          source={artForVehicle(vehicle)}
          resizeMode="contain"
          {...a11yImage(
            tr(messages, assetFallbackByClass[vehicle.rideClass] ?? ""),
          )}
          style={styles.vehicleImage}
        />
      )}
      <Text numberOfLines={1} style={styles.vehicleName}>
        {vehicle.nameI18n?.[locale] ?? vehicle.name}
      </Text>
      {price ? <Text style={styles.vehiclePrice}>{price}</Text> : null}
      <View style={styles.vehicleMetaRow}>
        {vehicle.capacity ? (
          <Text style={styles.vehicleEta}>
            {`${vehicle.capacity} ${tr(messages, "home.capacity")}`}
          </Text>
        ) : null}
        {vehicle.etaMinutes != null ? (
          <Text style={styles.vehicleEta}>
            {`${vehicle.etaMinutes} ${tr(messages, "home.eta")}`}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.vehicleBadge}>
          <Text style={styles.vehicleBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
// The card only depends on its own data: the parent rebuilds onPress on every
// render, but that closure is stable in behaviour, so it is left out of the
// comparison instead of being memoised at every call site.
const VehicleCard = React.memo(
  VehicleCardBase,
  (prev, next) =>
    prev.vehicle === next.vehicle &&
    prev.selected === next.selected &&
    prev.revision === next.revision &&
    prev.badge === next.badge &&
    prev.price === next.price &&
    prev.locale === next.locale &&
    prev.messages === next.messages &&
    prev.styles === next.styles,
);

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
    /* Stage content inside the ONE sheet: no surface, no radius, no shadow. */
    sheetBody: { gap: SPACING.md, paddingTop: SPACING.xs },
    /* Back chevron on the reading-exit side of a stage header. */
    backButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
      marginBottom: -SPACING.xs,
    },
    // --- flaminGO map pin overlay -----------------------------------------
    pinWrap: {
      position: "absolute",
      top: "50%",
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 10,
      transform: [{ translateY: -PIN_HEIGHT }],
    },
    label: { fontSize: 12, fontWeight: "700", color: palette.textMuted },
    locationText: {
      fontSize: 16,
      fontWeight: "700",
      color: palette.text,
      marginTop: 2,
    },
    muted: { fontSize: 14, color: palette.textMuted, lineHeight: 20 },
    stopMarker: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: brand.ink,
      borderWidth: 3,
      borderColor: brand.gold,
    },
    stopMarkerCore: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: brand.gold,
    },
    sheetTitle: {
      ...TYPE.title,
      color: palette.text,
      marginBottom: SPACING.xs,
    },
    vehicleList: { gap: 10, paddingVertical: 14 },
    vehicleCard: {
      width: 156,
      minHeight: 148,
      overflow: "hidden",
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 10,
      backgroundColor: palette.surface,
    },
    /* Selected ride card: gold border (NovaRide identity). */
    vehicleSelected: {
      borderWidth: 2,
      borderColor: palette.accent,
      backgroundColor: palette.surfaceAlt,
    },
    vehicleImage: { width: "100%", height: 72 },
    vehicleName: { fontSize: 16, fontWeight: "800", color: palette.text },
    vehiclePrice: {
      fontSize: 14,
      fontWeight: "800",
      color: palette.accent,
      marginTop: 2,
    },
    vehicleEta: { fontSize: 12, color: palette.textMuted, marginTop: 3 },
    vehicleMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    vehicleBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
      backgroundColor: withAlpha(palette.accent, 0.18),
    },
    vehicleBadgeText: { ...TYPE.overline, color: palette.accent },
    ctaWrap: { marginTop: SPACING.md },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    price: { fontSize: 21, fontWeight: "900", color: palette.text },
    metaRow: { flexDirection: "row", gap: 12, marginTop: 4 },
    meta: { fontSize: 13, color: palette.textMuted },
    paymentRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
      flexWrap: "wrap",
    },
    chip: {
      minHeight: 42,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    chipActive: {
      borderColor: palette.primary,
      backgroundColor: palette.surfaceAlt,
    },
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
    buttonTextLight: {
      fontSize: 16,
      fontWeight: "800",
      color: palette.onPrimary,
    },
    buttonTextDark: { fontSize: 16, fontWeight: "800", color: palette.text },
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
    // SOS: outlined in the danger colour rather than filled. A solid red block
    // next to the ordinary actions invites the accidental tap it must not get.
    sosButton: {
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: palette.surface,
      borderWidth: 1.5,
      borderColor: palette.danger,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
    },
    sosText: { fontSize: 16, fontWeight: "900", color: palette.danger },
    disabled: { opacity: 0.35 },
  });
}
