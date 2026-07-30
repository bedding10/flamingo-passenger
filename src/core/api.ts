import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { clearTokens, saveTokens, tokens } from "./storage";
import { markOffline, markOnline } from "./connectivity";

const baseURL = process.env.EXPO_PUBLIC_API_URL;
if (!baseURL) throw new Error("EXPO_PUBLIC_API_URL is required");

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { Accept: "application/json" },
});

let authenticationFailureHandler: (() => void | Promise<void>) | null = null;
export function onAuthenticationFailure(handler: () => void | Promise<void>) {
  authenticationFailureHandler = handler;
  return () => {
    if (authenticationFailureHandler === handler)
      authenticationFailureHandler = null;
  };
}

api.interceptors.request.use(async (config) => {
  const stored = await tokens();
  if (stored.access) config.headers.Authorization = `Bearer ${stored.access}`;
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };
let refreshing: Promise<string> | null = null;
const neverRefresh = (url?: string) =>
  ["/auth/refresh", "/auth/login", "/auth/register", "/auth/firebase"].some(
    (route) => String(url ?? "").includes(route),
  );

async function refreshAccessToken() {
  const stored = await tokens();
  if (!stored.refresh) throw Error("NO_REFRESH_TOKEN");
  const response = await axios.post(
    `${baseURL}/auth/refresh`,
    {
      refreshToken: stored.refresh,
    },
    { timeout: 15000, headers: { Accept: "application/json" } },
  );
  await saveTokens(response.data.accessToken, response.data.refreshToken);
  return response.data.accessToken as string;
}

api.interceptors.response.use(
  (response) => {
    // Every successful round trip is proof the radio works. This is the whole
    // online detector: no native connectivity module is shipped for a fact the
    // app already establishes on its own traffic.
    markOnline();
    return response;
  },
  async (error: AxiosError) => {
    // No `response` means the request never reached the server.
    if (error.response) markOnline();
    else markOffline();
    const config = error.config as RetryConfig | undefined;
    if (
      error.response?.status !== 401 ||
      !config ||
      config._retry ||
      neverRefresh(config.url)
    ) {
      throw error;
    }
    config._retry = true;
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null;
    });
    try {
      config.headers.Authorization = `Bearer ${await refreshing}`;
      return api(config);
    } catch (refreshError) {
      if (axios.isAxiosError(refreshError) && !refreshError.response) {
        throw refreshError;
      }
      await clearTokens();
      await authenticationFailureHandler?.();
      throw refreshError;
    }
  },
);
