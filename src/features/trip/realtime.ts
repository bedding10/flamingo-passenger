import { io, Socket } from "socket.io-client";
import { AppState, type AppStateStatus } from "react-native";
import { tokens } from "../../core/storage";

const base = process.env.EXPO_PUBLIC_API_URL;
if (!base) throw Error("EXPO_PUBLIC_API_URL_REQUIRED");

const ORIGIN = base.replace(/\/api\/?$/, "");

export type TripEvent = {
  tripId?: string;
  status?: string;
  lat?: number;
  lng?: number;
  heading?: number;
  speed?: number;
  driverId?: string;
  [key: string]: unknown;
};

export type TripChatMessage = {
  id: string;
  tripId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// One socket per trip, shared by every subscriber.
//
// Tracking (trip:status / ride:assigned / driver:moved) and chat (trip:message)
// used to open TWO independent WebSockets to the SAME `trip:{id}` room. That is
// two TLS handshakes, two heartbeat timers and two reconnect loops for one ride
// - a measurable battery and memory cost on entry-level phones.
//
// The wire protocol is unchanged: same origin, same auth, same `trip:join`
// emit and the same event names, so the backend contract is untouched.
// ---------------------------------------------------------------------------

type TripChannel = {
  socket: Socket;
  refs: number;
  detachAppState: () => void;
};

const channels = new Map<string, TripChannel>();

function createChannel(tripId: string): TripChannel {
  const socket: Socket = io(ORIGIN, {
    transports: ["websocket"],
    auth: async (callback) => {
      const stored = await tokens();
      callback({ token: stored.access });
    },
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 8000,
    randomizationFactor: 0.35,
  });

  // Re-join on every (re)connect so a dropped link restores the room.
  socket.on("connect", () => socket.emit("trip:join", { tripId }));

  // Backgrounded apps must not hold an open socket: Android/iOS throttle the
  // JS timers anyway, and the reconnect loop keeps the radio awake. We close on
  // background and reopen on foreground, which is what native ride-hailing
  // clients do.
  const onAppState = (state: AppStateStatus) => {
    if (state === "active") {
      if (!socket.connected) socket.connect();
    } else if (socket.connected) {
      socket.disconnect();
    }
  };
  const subscription = AppState.addEventListener("change", onAppState);

  return {
    socket,
    refs: 0,
    detachAppState: () => subscription.remove(),
  };
}

/**
 * Acquires the shared socket for a trip and returns a release function.
 * The underlying connection is torn down only when the last subscriber leaves.
 */
function acquire(tripId: string): { socket: Socket; release: () => void } {
  let channel = channels.get(tripId);
  if (!channel) {
    channel = createChannel(tripId);
    channels.set(tripId, channel);
  }
  channel.refs += 1;
  let released = false;
  const current = channel;
  return {
    socket: current.socket,
    release: () => {
      if (released) return;
      released = true;
      current.refs -= 1;
      if (current.refs > 0) return;
      current.detachAppState();
      current.socket.off();
      current.socket.disconnect();
      channels.delete(tripId);
    },
  };
}

/**
 * Live trip chat. Shares the `trip:{id}` connection with trip tracking and
 * calls `onMessage` the moment the driver sends a message.
 */
export async function connectTripChat(
  tripId: string,
  onMessage: (message: TripChatMessage) => void,
) {
  const { socket, release } = acquire(tripId);
  socket.on("trip:message", onMessage);
  return () => {
    socket.off("trip:message", onMessage);
    release();
  };
}

/**
 * Live trip tracking: status transitions, driver assignment and driver movement.
 */
export async function connectTrip(
  tripId: string,
  onUpdate: (payload: TripEvent) => void,
) {
  const { socket, release } = acquire(tripId);
  socket.on("trip:status", onUpdate);
  socket.on("ride:assigned", onUpdate);
  socket.on("driver:moved", onUpdate);
  return () => {
    socket.off("trip:status", onUpdate);
    socket.off("ride:assigned", onUpdate);
    socket.off("driver:moved", onUpdate);
    release();
  };
}
