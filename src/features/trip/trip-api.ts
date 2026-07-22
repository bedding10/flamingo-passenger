import * as Application from "expo-application";
import { Platform } from "react-native";
import { api } from "../../core/api";
import type {
  Catalog,
  FareOffer,
  PlaceSuggestion,
  Point,
  Quote,
  Trip,
} from "../../core/contracts";

const appVersion = Application.nativeApplicationVersion ?? "0.3.0";
export const passengerApi = {
  catalog: async () => {
    const { data } = await api.get<Catalog>("/catalog/vehicles", {
      params: {
        usageType: "RIDE",
        audience: "passenger",
        appId: Application.applicationId,
        clientOs: Platform.OS,
        appVersion,
      },
    });
    return data;
  },
  autocomplete: async (query: string, origin?: Point) => {
    const { data } = await api.get("/geo/autocomplete", {
      params: { q: query, lat: origin?.lat, lng: origin?.lng, limit: 8 },
    });
    return (
      Array.isArray(data) ? data : (data.items ?? data.predictions ?? [])
    ) as PlaceSuggestion[];
  },
  geocode: async (query: string): Promise<Point> => {
    const { data } = await api.get("/geo/geocode", { params: { q: query } });
    const item = Array.isArray(data) ? data[0] : data;
    const lat = Number(item?.lat ?? item?.latitude ?? item?.location?.lat);
    const lng = Number(item?.lng ?? item?.longitude ?? item?.location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      throw Error("INVALID_GEOCODE_RESPONSE");
    return {
      lat,
      lng,
      address: item.address ?? item.formattedAddress ?? query,
    };
  },
  directions: async (origin: Point, destination: Point) => {
    const { data } = await api.post("/geo/directions", {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
    });
    const raw = data.coordinates ?? data.route?.coordinates ?? [];
    return (Array.isArray(raw) ? raw : [])
      .map(
        (point: {
          lat?: number;
          lng?: number;
          latitude?: number;
          longitude?: number;
        }) => ({
          latitude: Number(point.latitude ?? point.lat),
          longitude: Number(point.longitude ?? point.lng),
        }),
      )
      .filter(
        (point: { latitude: number; longitude: number }) =>
          Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
      );
  },
  quote: async (
    pickup: Point,
    destination: Point,
    vehicleTypeId: string,
    rideClass: string,
  ) => {
    const { data } = await api.post<Quote>("/rides/quote", {
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      destLat: destination.lat,
      destLng: destination.lng,
      vehicleTypeId,
      rideClass,
    });
    return data;
  },
  requestRide: async (
    pickup: Point,
    destination: Point,
    vehicleTypeId: string,
    rideClass: string,
    paymentMethod: "CASH" | "WALLET" | "CARD",
  ) => {
    const { data } = await api.post<Trip>("/rides/request", {
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      pickupAddress: pickup.address,
      destLat: destination.lat,
      destLng: destination.lng,
      destAddress: destination.address,
      vehicleTypeId,
      rideClass,
      paymentMethod,
    });
    return data;
  },
  getRide: async (id: string) => (await api.get<Trip>(`/rides/${id}`)).data,
  cancelRide: async (id: string) =>
    (await api.patch<Trip>(`/rides/${id}/cancel`)).data,
  createNegotiation: async (
    pickup: Point,
    destination: Point,
    vehicleTypeId: string,
    rideClass: string,
  ) => {
    const { data } = await api.post<{
      id: string;
      suggestedFare?: number;
      suggested?: number;
    }>("/fare-quotes", {
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      pickupAddress: pickup.address,
      destLat: destination.lat,
      destLng: destination.lng,
      destAddress: destination.address,
      vehicleTypeId,
      rideClass,
    });
    return data;
  },
  propose: async (id: string, fare: number) =>
    (await api.post(`/fare-quotes/${id}/propose`, { fare })).data,
  offers: async (id: string) =>
    (await api.get<FareOffer[]>(`/fare-quotes/${id}/offers`)).data,
  acceptOffer: async (id: string, offerId: string) =>
    (await api.post<Trip>(`/fare-quotes/${id}/offers/${offerId}/accept`)).data,
};
