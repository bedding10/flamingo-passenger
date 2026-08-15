import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Point, Quote, Trip, VehicleType } from "../../core/contracts";
import { passengerApi } from "../trip/trip-api";
import {
  passengerServicesApi,
  type PassengerPaymentMethod,
} from "../../core/passenger-api";
import { activeCouponCode, clearActiveCoupon } from "../../core/coupon-store";

export type Negotiation = {
  id: string;
  suggestedFare?: number;
  suggested?: number;
};

export type SearchTarget = "pickup" | "destination" | `stop:${number}`;

/**
 * Catalog, place suggestions, route, quote, payment and fare negotiation.
 *
 * Everything here was lifted out of HomeScreen unchanged: same query keys,
 * same `enabled` conditions, same staleTime / refetchInterval, same endpoints.
 * The hook owns no navigation and no map concerns, so the screen can re-render
 * the sheet without touching the map.
 */
export function useRideQuote({
  pickup,
  destination,
  stops,
  search,
  searchTarget,
  onTripCreated,
}: {
  pickup: Point | null;
  destination: Point | null;
  stops: Array<Point | null>;
  search: string;
  searchTarget: SearchTarget | null;
  /** Called with the ride the server created, so the trip hook can adopt it. */
  onTripCreated: (trip: Trip) => void;
}) {
  const [selected, setSelected] = useState<VehicleType | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [payment, setPayment] = useState<
    PassengerPaymentMethod["method"] | null
  >(null);
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [proposedFare, setProposedFare] = useState("");
  // Offers the passenger explicitly turned down. Kept on the client so the
  // list stays clean while the server keeps its own PENDING/EXPIRED lifecycle.
  const [dismissedOffers, setDismissedOffers] = useState<string[]>([]);
  // Optional free-text note shown to drivers together with the proposed fare.
  const [fareNote, setFareNote] = useState("");

  // Ref-held so a fresh inline callback never rebuilds the mutation.
  const onTripCreatedRef = useRef(onTripCreated);
  useEffect(() => {
    onTripCreatedRef.current = onTripCreated;
  }, [onTripCreated]);

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
  const route = useQuery({
    queryKey: ["route", pickup, destination],
    queryFn: () => passengerApi.directions(pickup!, destination!),
    enabled: !!pickup && !!destination,
    staleTime: 300_000,
  });

  const vehicles = useMemo(
    () => catalog.data?.categories.flatMap((category) => category.types) ?? [],
    [catalog.data],
  );

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
      if (!pickup || !destination || !selected || !payment)
        throw Error("ROUTE_REQUIRED");
      const value = await passengerApi.requestRide(
        pickup,
        destination,
        selected.id,
        selected.rideClass,
        payment,
        stops.filter((stop): stop is Point => !!stop),
        // Forward the activated coupon; the server owns validation and pricing.
        activeCouponCode() ?? undefined,
      );
      // The ride consumed the code, so it must not ride along on the next one.
      clearActiveCoupon();
      onTripCreatedRef.current(value);
      return value;
    },
  });

  const startNegotiation = useCallback(async () => {
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
  }, [pickup, destination, selected, quote]);

  return {
    catalog,
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
  };
}
