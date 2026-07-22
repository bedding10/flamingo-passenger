import axios from "axios";
import { create } from "zustand";
import type { Profile, Session } from "./contracts";
import { api, onAuthenticationFailure } from "./api";
import { cache, clearTokens, saveTokens, tokens } from "./storage";
import { unregisterNotifications } from "./notifications";

const IDENTITY_KEY = "session.identity";
const PROFILE_KEY = "session.profile";
type CachedIdentity = Pick<Session, "userId" | "role" | "user">;

type State = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  restore: () => Promise<void>;
  accept: (session: Session) => Promise<void>;
  logout: () => Promise<void>;
};

function readCache<T>(key: string): T | null {
  const raw = cache.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    cache.delete(key);
    return null;
  }
}
function persist(identity: CachedIdentity, profile: Profile) {
  cache.set(IDENTITY_KEY, JSON.stringify(identity));
  cache.set(PROFILE_KEY, JSON.stringify(profile));
}
function clearSessionCache() {
  cache.delete(IDENTITY_KEY);
  cache.delete(PROFILE_KEY);
}

export const useSession = create<State>((set) => ({
  ready: false,
  session: null,
  profile: null,
  restore: async () => {
    const stored = await tokens();
    if (!stored.access || !stored.refresh) {
      set({ ready: true, session: null, profile: null });
      return;
    }
    const identity = readCache<CachedIdentity>(IDENTITY_KEY);
    const cachedProfile = readCache<Profile>(PROFILE_KEY);
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
    try {
      const [{ data: me }, { data: profile }] = await Promise.all([
        api.post<CachedIdentity>("/auth/me"),
        api.get<Profile>("/passenger/me"),
      ]);
      const session: Session = {
        ...me,
        accessToken: (await tokens()).access ?? stored.access,
        refreshToken: (await tokens()).refresh ?? stored.refresh,
      };
      persist(me, profile);
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
    persist(
      { userId: session.userId, role: session.role, user: session.user },
      profile,
    );
    set({ session, profile, ready: true });
  },
  logout: async () => {
    try {
      await unregisterNotifications();
      await api.post("/auth/logout");
    } finally {
      await clearTokens();
      clearSessionCache();
      set({ session: null, profile: null, ready: true });
    }
  },
}));

onAuthenticationFailure(async () => {
  clearSessionCache();
  useSession.setState({ session: null, profile: null, ready: true });
});
