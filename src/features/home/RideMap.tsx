import React from "react";
import { Image, StyleSheet, View } from "react-native";
import MapView, {
  AnimatedRegion,
  LatLng,
  Marker,
  Polyline,
  type Region,
} from "react-native-maps";
import type { Point } from "../../core/contracts";
import { tr } from "../../core/i18n";
import { withAlpha, type Palette } from "../../core/theme";
import PickupPin from "../../components/map/PickupPin";
import DropoffPin from "../../components/map/DropoffPin";
import { RouteComet } from "./RouteComet";
import type { Styles } from "./HomeScreen";

// Top-down vehicle artwork used for the live driver marker. Bundled in the
// app (3KB each) so the marker draws instantly, offline, with no network hop.
const CAR_MARKER = require("../../../assets/vehicle-car.webp");
const MOTO_MARKER = require("../../../assets/vehicle-moto.webp");
const markerForClass = (rideClass?: string) =>
  rideClass === "BIKE" || rideClass === "MOTO" ? MOTO_MARKER : CAR_MARKER;

export type RideMapProps = {
  mapRef: React.RefObject<MapView>;
  mapStyle: React.ComponentProps<typeof MapView>["customMapStyle"];
  styles: Styles;
  palette: Palette;
  messages: Record<string, string>;
  pickup: Point;
  destination: Point | null;
  stops: Array<Point | null>;
  /** The gold pickup pin is hidden while the pickup is simply "where I am". */
  showPickupPin: boolean;
  pinMode: string | null;
  pinDragging: boolean;
  driverVisible: boolean;
  driverCoordinate: AnimatedRegion;
  driverHeading: number;
  driverRideClass?: string;
  routePoints?: LatLng[];
  onRegionChange: () => void;
  onRegionChangeComplete: (region: Region) => void;
};

/**
 * The map layer: camera, pins, stops, the animated driver marker and the gold
 * route. Pure presentation - it owns no state, performs no geocoding and calls
 * no API. It is memoised so sheet, drawer, pricing and negotiation re-renders
 * never reach the map.
 */
function RideMapBase({
  mapRef,
  mapStyle,
  styles,
  palette,
  messages,
  pickup,
  destination,
  stops,
  showPickupPin,
  pinMode,
  pinDragging,
  driverVisible,
  driverCoordinate,
  driverHeading,
  driverRideClass,
  routePoints,
  onRegionChange,
  onRegionChangeComplete,
}: RideMapProps) {
  // The initial camera is a mount-time concern only: it is frozen on the first
  // render so a later pickup change can never yank the camera, exactly like the
  // inline `initialRegion` it replaces.
  const initialRegion = React.useRef({
    latitude: pickup.lat,
    longitude: pickup.lng,
    latitudeDelta: 0.035,
    longitudeDelta: 0.035,
  }).current;
  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      customMapStyle={mapStyle}
      initialRegion={initialRegion}
      onRegionChange={onRegionChange}
      onRegionChangeComplete={onRegionChangeComplete}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
      /* Full map detail: shops, malls, landmarks, buildings and transit. */
      showsPointsOfInterest
      showsBuildings
      showsIndoors
      showsTraffic={false}
    >
      {/* flaminGO gold pins: person head for the pickup, checkered flag for
          the drop-off. Identical geometry, gold speech bubble on top.
          The pickup pin is SUPPRESSED while the pickup is simply "where I am":
          the platform already draws the blue location dot there, and two
          markers on one spot read as a bug. It comes back the moment the
          pickup is placed somewhere else, or is being placed by hand. */}
      {showPickupPin ? (
        <Marker
          coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
        >
          {/* Confirmed point: a bare gold disc, and no speech bubble. The
              bubble belongs to manual placement only. */}
          <PickupPin
            label={tr(messages, "home.pickupHere")}
            state="snapped"
            variant="compact"
            hideBubble={pinMode !== "pickup"}
          />
        </Marker>
      ) : null}
      {destination ? (
        <Marker
          coordinate={{
            latitude: destination.lat,
            longitude: destination.lng,
          }}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
        >
          <DropoffPin
            label={tr(messages, "home.dropoffHere")}
            state="snapped"
            variant="compact"
            hideBubble={pinMode !== "destination"}
          />
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
          rotation={driverHeading}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
          tracksViewChanges={false}
        >
          <Image
            source={markerForClass(driverRideClass)}
            style={styles.vehicleMarker}
            resizeMode="contain"
          />
        </Marker.Animated>
      ) : null}
      {/* Route: dimmed while a pin is dragged, redrawn right after it lands. */}
      {routePoints?.length ? (
        <>
          {/* Gold route: a soft gold halo, the 7px gold line itself with
              round caps and joins, then the travelling light. */}
          <Polyline
            coordinates={routePoints}
            strokeColor={withAlpha(palette.accent, pinDragging ? 0.1 : 0.22)}
            strokeWidth={14}
            lineCap="round"
            lineJoin="round"
          />
          <Polyline
            coordinates={routePoints}
            strokeColor={withAlpha(palette.accent, pinDragging ? 0.35 : 1)}
            strokeWidth={7}
            lineCap="round"
            lineJoin="round"
          />
          <RouteComet
            points={routePoints}
            accent={palette.accent}
            glow={palette.routeGlow}
            paused={pinDragging}
          />
        </>
      ) : null}
    </MapView>
  );
}

// Shallow prop comparison is enough because every prop is either a primitive,
// a stable ref (map ref, animated coordinate), a memoised value (styles, map
// style, callbacks) or a query/state object that only changes identity when it
// really changed. Typing a fare, opening the drawer, moving the sheet or
// ticking the negotiation timer therefore no longer re-render the map.
const RideMap = React.memo(RideMapBase);
export default RideMap;
