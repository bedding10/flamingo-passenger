// Coupon the passenger activated but has not spent yet.
//
// This store holds a code string and nothing else. It is deliberately NOT a
// discount cache: the server revalidates the code and recomputes the discount
// from its own fare when the ride is requested, so a tampered client value
// cannot change what the passenger pays.
//
// Persisted through the same encrypted MMKV cache used by theme-store and
// locale-store, so an activated coupon survives an app restart made before the
// ride is booked.

import { create } from "zustand";
import { cache } from "./storage";

export const COUPON_KEY = "app.coupon";

type CouponState = {
  code: string | null;
  /** Stores the code the server just accepted, normalised the way it is sent. */
  setCode: (code: string) => void;
  /** Called once a ride carried the code, so it is not silently reused. */
  clear: () => void;
};

function initialCode(): string | null {
  return cache.getString(COUPON_KEY) ?? null;
}

export const useCouponStore = create<CouponState>((set) => ({
  code: initialCode(),
  setCode: (code) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    cache.set(COUPON_KEY, normalized);
    set({ code: normalized });
  },
  clear: () => {
    cache.delete(COUPON_KEY);
    set({ code: null });
  },
}));

/** Non-reactive read for callers outside React (mutations, request builders). */
export function activeCouponCode(): string | null {
  return useCouponStore.getState().code;
}

/** Non-reactive clear for the same callers. */
export function clearActiveCoupon(): void {
  useCouponStore.getState().clear();
}
