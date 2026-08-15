import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatedRegion } from "react-native-maps";
import type { Trip } from "../../core/contracts";
import { passengerApi } from "../trip/trip-api";
import { connectTrip, type TripEvent, type TripSignal } from "../trip/realtime";
import { useSession } from "../../core/session-store";

export const ACTIVE = new Set([
  "SEARCHING",
  "ACCEPTED",
  "ARRIVING",
  "IN_PROGRESS",
]);

export type MatchFailure = {
  kind: "noDrivers" | "error";
  code?: string;
};

/**
 * The live ride: server state, the safety-net poll, the realtime socket and
 * the animated driver marker coordinate.
 *
 * Lifted out of HomeScreen with no behavioural change: same query key, same
 * refetch interval, the exact same `connectTrip` subscription and the same
 * signal-to-failure mapping. No new socket event is emitted or listened to.
 */
export function useTripLifecycle() {
  const [trip, setTrip] = useState<Trip | null>(null);
  // Terminal outcome of the matching search, fed by the socket lifecycle.
  // Until now `ride:no_drivers` and `ride:error` were never consumed, so a
  // failed search left the passenger staring at an eternal "searching" pulse.
  const [matchFailure, setMatchFailure] = useState<MatchFailure | null>(null);
  const driverCoordinate = useRef(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;
  const hasDriverCoordinate = useRef(false);
  // Which trip the marker position currently belongs to. Without this the
  // flag above stayed true after a trip ended, so the FIRST fix of the next
  // trip animated the car across the city from the old driver's position.
  const markerTripId = useRef<string | null>(null);

  const tripPoll = useQuery({
    queryKey: ["trip", trip?.id],
    queryFn: () => passengerApi.getRide(trip!.id),
    enabled: !!trip?.id && ACTIVE.has(trip.status),
    // The socket pushes trip:status the moment it changes; this poll is only
    // a safety net for a dropped connection, so it can run far slower.
    refetchInterval: trip?.id && ACTIVE.has(trip.status) ? 20000 : false,
  });

  useEffect(() => {
    if (tripPoll.data) setTrip((old) => ({ ...old, ...tripPoll.data }) as Trip);
  }, [tripPoll.data]);

  useEffect(() => {
    if (!trip?.id || !ACTIVE.has(trip.status)) return;
    // New trip -> the next fix must snap, not travel.
    if (markerTripId.current !== trip.id) {
      markerTripId.current = trip.id;
      hasDriverCoordinate.current = false;
    }
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
      // Phase 11 - a completed trip may have moved the passenger up a level
      // (9 -> 10 = BRONZE -> SILVER). The existing session refresh re-reads
      // /passenger/me, so the new level and frame appear without logging out.
      // No new socket event and no new realtime layer is introduced.
      if (event.status === "COMPLETED") {
        void useSession.getState().restore();
      }
    };
    const signal = (event: TripSignal) => {
      switch (event.type) {
        case "searching":
          // A new search round started: clear any previous failure.
          setMatchFailure(null);
          break;
        case "accepted":
        case "assigned":
          setMatchFailure(null);
          break;
        case "noDrivers":
          setMatchFailure({ kind: "noDrivers" });
          break;
        case "error":
          setMatchFailure({ kind: "error", code: event.code });
          break;
        default:
          // Offer signals are consumed by the negotiation panel.
          break;
      }
    };
    void connectTrip(trip.id, update, signal)
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

  return {
    trip,
    setTrip,
    matchFailure,
    setMatchFailure,
    driverCoordinate,
  };
}
