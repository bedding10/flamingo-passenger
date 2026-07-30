import { io, Socket } from "socket.io-client";
import { AppState, type AppStateStatus } from "react-native";
import { tokens } from "../../core/storage";
import { markSocket } from "../../core/connectivity";

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
// Matching lifecycle signals.
//
// The backend has always emitted the full matching lifecycle, but the app only
// subscribed to `trip:status`, `ride:assigned` and `driver:moved`. Everything
// that tells the passenger the search FAILED - `ride:no_drivers`, `ride:error`,
// `ride:offer_expired` - was dropped on the floor, which is why the UI could
// sit on "searching for a driver" forever.
//
// These are delivered on a SEPARATE callback rather than merged into the trip
// object, because they are not partial trips: spreading them into the trip
// would corrupt its shape. No new event name is invented and no payload is
// reshaped - this only consumes what the server already sends.
// ---------------------------------------------------------------------------
export type TripSignalType =
  | "searching" // ride:searching       - matching started / still running
  | "accepted" // ride:accepted        - a driver took the ride
  | "assigned" // ride:assigned        - driver + vehicle attached
  | "noDrivers" // ride:no_drivers      - search exhausted, terminal
  | "error" // ride:error           - matching failed server-side
  | "offer" // ride:offer           - a negotiation offer arrived
  | "offerExpired"; // ride:offer_expired   - that offer timed out

export type TripSignal = {
  type: TripSignalType;
  /** Business code when the server sends one, e.g. "CITY_CAPACITY_REJECTED". */
  code?: string;
  payload: TripEvent;
};

/** Wire event name -> signal type. Server contract, do not rename. */
const SIGNAL_EVENTS: Record<string, TripSignalType> = {
  "ride:searching": "searching",
  "ride:accepted": "accepted",
  "ride:assigned": "assigned",
  "ride:no_drivers": "noDrivers",
  "ride:error": "error",
  "ride:offer": "offer",
  "ride:offer_expired": "offerExpired",
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

/** True while at least one trip channel is open, so we only report real state. */
const anyChannelOpen = () => channels.size > 0;

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

  markSocket("connecting");

  // Re-join on every (re)connect so a dropped link restores the room.
  socket.on("connect", () => {
    markSocket("connected");
    socket.emit("trip:join", { tripId });
  });

  // Without these two listeners a dropped realtime link was completely silent:
  // the map froze on the last known driver position and the passenger had no
  // way to tell a stopped car from a dead socket.
  socket.on("disconnect", () => {
    if (anyChannelOpen()) markSocket("disconnected");
  });
  socket.io.on("reconnect_attempt", () => {
    if (anyChannelOpen()) markSocket("connecting");
  });
  socket.on("connect_error", () => {
    if (anyChannelOpen()) markSocket("disconnected");
  });

  // Backgrounded apps must not hold an open socket: Android/iOS throttle the
  // JS timers anyway, and the reconnect loop keeps the radio awake. We close on
  // background and reopen on foreground, which is what native ride-hailing
  // clients do.
  const onAppState = (state: AppStateStatus) => {
    if (state === "active") {
      if (!socket.connected) {
        markSocket("connecting");
        socket.connect();
      }
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
      current.socket.io.off("reconnect_attempt");
      current.socket.disconnect();
      channels.delete(tripId);
      // No live trip left: the banner must not claim we are reconnecting.
      if (!anyChannelOpen()) markSocket("idle");
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
 * Live trip tracking.
 *
 * @param onUpdate Partial trip patches (status, driver assignment, movement).
 * @param onSignal Matching-lifecycle signals. Optional so existing callers keep
 *   working unchanged; screens that render "no driver found" pass it.
 */
export async function connectTrip(
  tripId: string,
  onUpdate: (payload: TripEvent) => void,
  onSignal?: (signal: TripSignal) => void,
) {
  const { socket, release } = acquire(tripId);

  socket.on("trip:status", onUpdate);
  socket.on("ride:assigned", onUpdate);
  socket.on("driver:moved", onUpdate);

  // One bound listener per lifecycle event, kept in a list so teardown removes
  // exactly what was added (socket.off(name) without a handler would also strip
  // the listeners of any other subscriber sharing this channel).
  const bound: Array<[string, (payload: TripEvent) => void]> = [];
  if (onSignal) {
    for (const [event, type] of Object.entries(SIGNAL_EVENTS)) {
      const handler = (payload: TripEvent = {}) => {
        const code =
          typeof payload.code === "string" ? payload.code : undefined;
        onSignal({ type, code, payload });
      };
      socket.on(event, handler);
      bound.push([event, handler]);
    }
  }

  return () => {
    socket.off("trip:status", onUpdate);
    socket.off("ride:assigned", onUpdate);
    socket.off("driver:moved", onUpdate);
    for (const [event, handler] of bound) socket.off(event, handler);
    release();
  };
}
