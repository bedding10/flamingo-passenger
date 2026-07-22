export type Locale = "ar" | "fr" | "en";
export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
export type Point = { lat: number; lng: number; address?: string };
export interface Session {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: "PASSENGER";
  user: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    type: string;
    status: string;
  };
}
export interface Profile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string | null;
  locale: Locale;
  gender?: Gender | null;
  profileComplete: boolean;
}
export interface TranslationBundle {
  locale: Locale;
  version: number;
  notModified: boolean;
  messages?: Record<string, string>;
}
export interface VehicleType {
  id: string;
  name: string;
  nameI18n?: Record<string, string>;
  rideClass: string;
  imageAssetKey?: string | null;
  allowsNegotiation: boolean;
  supportsCash: boolean;
  supportsWallet: boolean;
  etaMinutes?: number | null;
  capacity?: number;
  resolvedPricing?: { currency: string } | null;
}
export interface VehicleCategory {
  id: string;
  name: string;
  types: VehicleType[];
}
export interface Catalog {
  version: number;
  categories: VehicleCategory[];
}
export interface FareOffer {
  id: string;
  fare: number;
  status: string;
  driver?: { id?: string; name?: string; rating?: number };
}
export interface Quote {
  fare?: number;
  total?: number;
  amount?: number;
  currency?: string;
  distanceKm?: number;
  durationMinutes?: number;
}
export interface Trip {
  id: string;
  status: string;
  fare?: number;
  currency?: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupAddress?: string;
  destLat?: number;
  destLng?: number;
  destAddress?: string;
  driver?: {
    id?: string;
    name?: string;
    phone?: string;
    rating?: number;
    avatarUrl?: string;
  };
  vehicle?: { make?: string; model?: string; color?: string; plate?: string };
  driverLat?: number;
  driverLng?: number;
  heading?: number;
  [key: string]: unknown;
}
export interface PlaceSuggestion {
  id?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  address?: string;
  description?: string;
  label?: string;
  name?: string;
}
