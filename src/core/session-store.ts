import axios from "axios";
import { create } from "zustand";
import type { Profile, Session } from "./contracts";
import { api, onAuthenticationFailure } from "./api";
import {
  clearTokens, deleteSecureItems, readSecureJson, saveSecureJson,
  saveTokens, tokens,
} from "./storage";
import { unregisterNotifications } from "./notifications";

const IDENTITY_KEY = "session.identity";
const PROFILE_KEY = "session.profile";
type CachedIdentity = Pick<Session, "userId" | "role" | "user">;

type State = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  /**
   * True when the refresh token was rejected and the user was signed out by
   * the server rather than by choice. Without this flag the app silently
   * dropped the user back on the login screen with no explanation, which reads
   * as a crash. A deliberate logout leaves it false.
   */
  expired: boolean;
  restore: () => Promise<void>;
  accept: (session: Session) => Promise<void>;
  logout: () => Promise<void>;
};

async function persist(identity: CachedIdentity, profile: Profile) {
  await Promise.all([
    saveSecureJson(IDENTITY_KEY, identity),
    saveSecureJson(PROFILE_KEY, profile),
  ]);
}
async function clearSessionCache() {
  await deleteSecureItems(IDENTITY_KEY, PROFILE_KEY);
}

export const useSession = create<State>((set) => ({
  ready: false,
  session: null,
  profile: null,
  expired: false,
  restore: async () => {
    const stored = await tokens();
    if (!stored.access || !stored.refresh) {
      set({ ready: true, session: null, profile: null });
      return;
    }
    const [identity, cachedProfile] = await Promise.all([
      readSecureJson<CachedIdentity>(IDENTITY_KEY),
      readSecureJson<Profile>(PROFILE_KEY),
    ]);
    if (identity && cachedProfile) {
      set({
        session: {
          ...identity,
          accessToken: stored.access,
          refreshToken: stored.refresh,
        },
        profile: cachedProfile,
        ready: true,
      });
    }
    if (!identity) {
      await clearTokens();
      set({ ready: true, session: null, profile: null });
      return;
    }
    try {
      const { data: profile } = await api.get<Profile>("/passenger/me");
      const refreshed = await tokens();
      const session: Session = {
        ...identity,
        accessToken: refreshed.access ?? stored.access,
        refreshToken: refreshed.refresh ?? stored.refresh,
      };
      await persist(identity, profile);
      set({ session, profile, ready: true });
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        !error.response &&
        identity &&
        cachedProfile
      ) {
        set({ ready: true });
        return;
      }
      if (!identity || !cachedProfile)
        set({ ready: true, session: null, profile: null });
    }
  },
  accept: async (session) => {
    await saveTokens(session.accessToken, session.refreshToken);
    const { data: profile } = await api.get<Profile>("/passenger/me");
    await persist(
      { userId: session.userId, role: session.role, user: session.user },
      profile,
    );
    set({ session, profile, ready: true, expired: false });
  },
  logout: async () => {
    try {
      await unregisterNotifications();
      await api.post("/auth/logout");
    } finally {
      await clearTokens();
      await clearSessionCache();
      set({ session: null, profile: null, ready: true, expired: false });
    }
  },
}));

onAuthenticationFailure(async () => {
  await Promise.all([clearTokens(), clearSessionCache()]);
  useSession.setState({
    session: null,
    profile: null,
    ready: true,
    expired: true,
  });
});
