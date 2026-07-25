import { io, Socket } from "socket.io-client";
import { tokens } from "../../core/storage";
const base = process.env.EXPO_PUBLIC_API_URL;
if (!base) throw Error("EXPO_PUBLIC_API_URL_REQUIRED");
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

/**
 * Live trip chat. Joins the same `trip:{id}` room as the tracking socket and
 * calls `onMessage` the moment the driver sends a message.
 */
export async function connectTripChat(
  tripId: string,
  onMessage: (message: TripChatMessage) => void,
) {
  const socket: Socket = io(base.replace(/\/api\/?$/, ""), {
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
  socket.on("connect", () => socket.emit("trip:join", { tripId }));
  socket.on("trip:message", onMessage);
  return () => {
    socket.off();
    socket.disconnect();
  };
}

export async function connectTrip(
  tripId: string,
  onUpdate: (payload: TripEvent) => void,
) {
  const socket: Socket = io(base.replace(/\/api\/?$/, ""), {
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
  socket.on("connect", () => socket.emit("trip:join", { tripId }));
  socket.on("trip:status", onUpdate);
  socket.on("ride:assigned", onUpdate);
  socket.on("driver:moved", onUpdate);
  return () => {
    socket.off();
    socket.disconnect();
  };
}
