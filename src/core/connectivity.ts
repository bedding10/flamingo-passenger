// ---------------------------------------------------------------------------
// Connectivity state for the whole app.
//
// The app must react to two independent link failures:
//   1. the HTTP link  — axios rejects with no `response` when the radio is down
//   2. the realtime link — socket.io emits `disconnect` / `connect_error`
//
// Both signals are collected here so a single banner can explain what is
// happening instead of the UI silently freezing on its last known state.
//
// NO NEW DEPENDENCY: the online/offline signal is derived from traffic the app
// already performs (every axios call feeds it) plus the socket lifecycle, so we
// do not ship a native connectivity module for information we already hold.
// ---------------------------------------------------------------------------
import { create } from "zustand";

/** HTTP reachability, inferred from real request outcomes. */
export type LinkState = "online" | "offline";

/** Realtime channel state, mirrored from socket.io. */
export type SocketState = "idle" | "connecting" | "connected" | "disconnected";

type ConnectivityState = {
  link: LinkState;
  socket: SocketState;
  /** True once a request or socket has failed and not yet recovered. */
  degradedSince: number | null;
  setLink: (state: LinkState) => void;
  setSocket: (state: SocketState) => void;
};

export const useConnectivity = create<ConnectivityState>()((set, get) => ({
  link: "online",
  socket: "idle",
  degradedSince: null,
  setLink: (state) => {
    if (get().link === state) return; // never re-render for an unchanged value
    set({
      link: state,
      degradedSince:
        state === "offline" ? (get().degradedSince ?? Date.now()) : null,
    });
  },
  setSocket: (state) => {
    if (get().socket === state) return;
    set({ socket: state });
  },
}));

/** Non-hook writers, used from the axios interceptor and the socket factory. */
export const markOnline = () => useConnectivity.getState().setLink("online");
export const markOffline = () => useConnectivity.getState().setLink("offline");
export const markSocket = (state: SocketState) =>
  useConnectivity.getState().setSocket(state);

/**
 * The one value the UI needs: what, if anything, should be shown to the user.
 *
 * - `offline`      — no network at all; nothing will succeed
 * - `reconnecting` — network is fine but the live trip channel dropped
 * - `null`         — everything is healthy, render nothing
 */
export type ConnectionNotice = "offline" | "reconnecting" | null;

export function connectionNotice(
  link: LinkState,
  socket: SocketState,
): ConnectionNotice {
  if (link === "offline") return "offline";
  if (socket === "disconnected" || socket === "connecting")
    return "reconnecting";
  return null;
}
