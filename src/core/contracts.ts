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
  /** Average star rating given to the passenger by drivers. */
  rating?: number | null;
  /** Completed trips, shown in parentheses next to the rating. */
  tripCount?: number | null;
  /** How many ratings the average is based on. */
  ratingCount?: number | null;
  // Phase 11 - all four fields are computed by the backend from COMPLETED trips.
  // The app never sends them (updateProfile does not accept them) and never
  // derives a level from a trip count: no threshold lives in this app.
  completedTripsCount?: number | null;
  /** BRONZE | SILVER | GOLD | DIAMOND | LEGENDARY, decided server-side. */
  profileLevel?: string | null;
  /** Public frame URL the backend built from the R2 object key. */
  profileFrameUrl?: string | null;
  nextLevel?: string | null;
  nextLevelAt?: number | null;
  tripsToNextLevel?: number | null;
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
  currency?: string;
  /** ISO date; when the server sends it the UI shows a live countdown. */
  expiresAt?: string;
  createdAt?: string;
  /** رسالة السائق المرفقة بعرضه. */
  note?: string | null;
  etaMinutes?: number | null;
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
    // Phase 11 - served with the trip so the sheet needs no extra request.
    completedTripsCount?: number | null;
    profileLevel?: string | null;
    profileFrameUrl?: string | null;
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
