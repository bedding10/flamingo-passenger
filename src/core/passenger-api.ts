import { Platform } from "react-native";
import * as Application from "expo-application";
import { api } from "./api";
import { idempotencyHeaders } from "./idempotency";
import type { Locale, PlaceSuggestion, Profile, Trip } from "./contracts";

export type Page<T> = { items: T[]; total: number; page: number; limit: number };
export type SavedPlaceKind = "HOME" | "WORK" | "RECENT" | "OTHER";
export type SavedPlace = { id: string; kind: SavedPlaceKind; label: string; address: string; lat: number; lng: number; placeId?: string | null; lastUsedAt?: string | null };
export type WalletTransaction = { id: string; amount: number | string; createdAt: string; transaction?: { id: string; type?: string; status?: string; reason?: string; referenceType?: string } };
export type Wallet = { balance: number; currency: string; lockedBalance: number; source: "LEDGER"; transactions: WalletTransaction[]; total: number; page: number; limit: number };
export type NotificationItem = { id: string; title: string; body: string; imageUrl?: string | null; deepLink?: string | null; sentAt?: string | null; createdAt: string; readAt?: string | null; isRead: boolean };
export type PassengerPaymentMethod = { method: "CASH" | "WALLET" | "CARD"; provider?: string; labelKey: string; enabled: boolean };
export type PassengerPayment = { id: string; tripId: string; amount: number | string; method: "CASH" | "WALLET" | "CARD"; status: string; provider: string; providerStatus?: string | null; reference?: string | null; createdAt: string; updatedAt: string };
export type PassengerCheckout = { payment: PassengerPayment; checkout: { provider: string; providerPaymentId: string; providerStatus: string; checkoutUrl?: string | null; payload?: Record<string, unknown> } };
export type TripCommunication = { tripId: string; status: string; active: boolean; canChat: boolean; canCall: boolean; phoneMode: "HIDDEN" | "DIRECT" | "BRIDGE"; phoneNumber?: string | null; participant: { id: string; name?: string | null; avatarUrl?: string | null } };
export type TripMessage = { id: string; tripId: string; senderId: string; body: string; createdAt: string };
export type ReferralCode = { id: string; code: string; createdAt: string };
export type Referral = { id: string; code: string; status: string; referrerReward?: number | null; refereeReward?: number | null; currency?: string | null; createdAt: string };
export type SubscriptionPlan = { id: string; code: string; name: string; description?: string | null; price: number; currency: string; interval: string; benefitDiscountPct: number; benefitMaxDiscount?: number | null; perks?: Record<string, unknown> | null };
export type UserSubscription = { id: string; status: string; autoRenew: boolean; currentPeriodEnd: string; cancelledAt?: string | null; plan?: SubscriptionPlan };
export type SupportTicket = { id: string; subject: string; category?: string | null; status: string; priority?: string; createdAt: string; updatedAt: string; messages?: SupportMessage[]; _count?: { messages: number } };
export type SupportMessage = { id: string; body: string; senderId: string; createdAt: string; sender?: { name: string; type: string } };
export type LegalDocument = { id: string; type: string; audience: string; locale: string; title: string; body: string; summary?: string | null; version: number; requiresAcceptance: boolean; effectiveAt?: string | null; publishedAt?: string | null };
export type MenuRoute = "Profile" | "Wallet" | "Trips" | "Places" | "Notifications" | "Coupons" | "Referrals" | "Subscriptions" | "Support" | "Contact" | "About" | "Legal" | "Settings" | "DeleteAccount";
export type PassengerConfig = { version: number; settings: { "passenger.navigation"?: { items: { route: MenuRoute; labelKey: string; enabled: boolean }[] }; "passenger.localization"?: { supportedLocales: Locale[] }; "passenger.contact"?: { phone?: string; email?: string; website?: string }; "passenger.accountDeletion"?: { confirmationText: string }; [key: string]: unknown } };

const page = { page: 1, limit: 30 };
export const passengerServicesApi = {
  config: async () => (await api.get<PassengerConfig>("/public/config", { params: { appId: "flamingo-passenger", clientOs: Platform.OS, version: Application.nativeApplicationVersion ?? undefined } })).data,
  profile: async () => (await api.get<Profile>("/passenger/me")).data,
  updateProfile: async (payload: Partial<Pick<Profile, "name" | "avatarUrl" | "locale" | "gender">>) => (await api.patch<Profile>("/passenger/me", payload)).data,
  changePassword: async (currentPassword: string, newPassword: string, revokeOtherSessions = true) => (await api.post<{ ok: true; otherSessionsRevoked: boolean }>("/auth/password/change", { currentPassword, newPassword, revokeOtherSessions })).data,
  trips: async (pageNumber = 1) => (await api.get<Page<Trip>>("/rides/mine", { params: { ...page, page: pageNumber } })).data,
  trip: async (tripId: string) => (await api.get<Trip>(`/rides/${encodeURIComponent(tripId)}`)).data,
  places: async () => (await api.get<SavedPlace[]>("/geo/places")).data,
  createPlace: async (payload: Omit<SavedPlace, "id">) => (await api.post<SavedPlace>("/geo/places", payload)).data,
  removePlace: async (id: string) => (await api.delete(`/geo/places/${encodeURIComponent(id)}`)).data,
  autocomplete: async (q: string) => (await api.get<PlaceSuggestion[]>("/geo/autocomplete", { params: { q, limit: 12 } })).data,
  geocode: async (q: string) => (await api.get<PlaceSuggestion[]>("/geo/geocode", { params: { q } })).data,
  recent: async (payload: Omit<SavedPlace, "id" | "kind">) => (await api.post<SavedPlace>("/geo/places/recent", payload)).data,
  wallet: async (pageNumber = 1) => (await api.get<Wallet>("/wallet/me", { params: { ...page, page: pageNumber } })).data,
  validateCoupon: async (code: string, fare: number) => (await api.post<{ valid: boolean; discount: number; finalFare: number; currency?: string }>("/coupons/validate", { code, fare })).data,
  notifications: async (pageNumber = 1) => (await api.get<Page<NotificationItem>>("/notifications/me", { params: { ...page, page: pageNumber } })).data,
  markNotification: async (id: string, read: boolean) => (await api.patch(`/notifications/me/${encodeURIComponent(id)}/read`, { read })).data,
  markAllNotifications: async () => (await api.post("/notifications/me/read-all")).data,
  deleteNotification: async (id: string) => (await api.delete(`/notifications/me/${encodeURIComponent(id)}`)).data,
  deleteAllNotifications: async () => (await api.delete("/notifications/me")).data,
  referralCode: async () => (await api.get<ReferralCode>("/referrals/my-code")).data,
  referrals: async () => (await api.get<Page<Referral>>("/referrals/mine", { params: page })).data,
  applyReferral: async (code: string) => (await api.post<Referral>("/referrals/apply", { code })).data,
  plans: async () => (await api.get<SubscriptionPlan[]>("/subscriptions/plans")).data,
  subscription: async () => (await api.get<UserSubscription | null>("/subscriptions/me")).data,
  subscribe: async (planId: string) => (await api.post<UserSubscription>("/subscriptions/subscribe", { planId })).data,
  cancelSubscription: async (subscriptionId?: string) => (await api.post<UserSubscription>("/subscriptions/cancel", { subscriptionId })).data,
  tickets: async () => (await api.get<Page<SupportTicket>>("/support/tickets/me", { params: page })).data,
  ticket: async (id: string) => (await api.get<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}`)).data,
  createTicket: async (subject: string, message: string, category?: string) => (await api.post<SupportTicket>("/support/tickets", { subject, message, category })).data,
  replyTicket: async (id: string, body: string) => (await api.post<SupportMessage>(`/support/tickets/${encodeURIComponent(id)}/messages`, { body })).data,
  legal: async (locale: Locale) => (await api.get<LegalDocument[]>("/public/legal", { params: { audience: "PASSENGER", locale } })).data,
  legalConsent: async () => (await api.get<{ pending: { id: string; version: number }[]; accepted: { id: string; version: number }[] }>("/legal-documents/pending")).data,
  acceptLegal: async (id: string, version: number) => (await api.post(`/legal-documents/${encodeURIComponent(id)}/accept`, { version, source: "passenger_app" })).data,
  requestDeletion: async (confirmation: string, reason?: string) => (await api.post<{ id: string; status: string; requestedAt: string; scheduledFor: string }>("/passenger/me/deletion-request", { confirmation, reason })).data,
  deletionRequest: async () => (await api.get<{ id: string; status: string; requestedAt: string; scheduledFor: string } | null>("/passenger/me/deletion-request")).data,
  cancelDeletion: async () => (await api.delete("/passenger/me/deletion-request")).data,
  rateTrip: async (tripId: string, stars: number, comment?: string) =>
    (await api.post("/ratings", { tripId, stars, comment })).data,
  reportTrip: async (tripId: string, message: string, againstUserId?: string) =>
    (await api.post("/support/complaints", { tripId, message, againstUserId })).data,
  paymentMethods: async () => (await api.get<PassengerPaymentMethod[]>("/passenger/payments/methods")).data,
  tripPayment: async (tripId: string) => (await api.get<PassengerPayment | null>(`/passenger/payments/trip/${encodeURIComponent(tripId)}`)).data,
  checkoutTrip: async (tripId: string, method: PassengerPaymentMethod["method"], idempotencyKey: string) =>
    (await api.post<PassengerCheckout>(
      `/passenger/payments/trip/${encodeURIComponent(tripId)}/checkout`,
      { method },
      idempotencyHeaders(idempotencyKey),
    )).data,
  tripCommunication: async (tripId: string) => (await api.get<TripCommunication>(`/trip-communication/${encodeURIComponent(tripId)}`)).data,
  tripMessages: async (tripId: string, pageNumber = 1) => (await api.get<Page<TripMessage>>(`/trip-communication/${encodeURIComponent(tripId)}/messages`, { params: { ...page, page: pageNumber } })).data,
  sendTripMessage: async (tripId: string, body: string) => (await api.post<TripMessage>(`/trip-communication/${encodeURIComponent(tripId)}/messages`, { body })).data,
};
