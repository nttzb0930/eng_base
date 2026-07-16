import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearAuthSession, getAuthSession, setAccessToken } from "@/src/stores/auth-session.store";

type RetryableConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };
const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const webHttpClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

let refreshRequest: Promise<string> | null = null;
let onUnauthenticated: (() => void) | null = null;

export function setOnUnauthenticated(callback: () => void) {
  onUnauthenticated = callback;
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = axios
      .post<{ access_token: string }>(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        setAccessToken(data.access_token);
        return data.access_token;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

webHttpClient.interceptors.request.use((config) => {
  const token = getAuthSession().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

webHttpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const authRoute = config?.url?.includes("/auth/login") ||
      config?.url?.includes("/auth/refresh") || config?.url?.includes("/auth/logout");
    if (error.response?.status === 401 && config && !config._authRetry && !authRoute) {
      config._authRetry = true;
      try {
        const token = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return webHttpClient.request(config);
      } catch {
        clearAuthSession();
        onUnauthenticated?.();
      }
    }
    throw error;
  },
);
