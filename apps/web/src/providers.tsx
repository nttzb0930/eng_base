"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { authService } from "@/src/services/auth/auth.service";
import { clearAuthSession, getAuthSession, setAuthSession, subscribeAuthSession } from "@/src/stores/auth-session.store";
import { setOnUnauthenticated } from "@/src/lib/web-http-client";

type AuthContextValue = {
  status: "loading" | "authenticated" | "unauthenticated";
  login: (body: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(() => new QueryClient());
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  useSyncExternalStore(subscribeAuthSession, getAuthSession, getAuthSession);

  useEffect(() => {
    setOnUnauthenticated(() => {
      queryClient.clear();
      setStatus("unauthenticated");
      router.replace("/sign-in");
    });
    authService.refresh().then((result) => {
      setAuthSession({ accessToken: result.access_token, user: result.user });
      setStatus("authenticated");
    }).catch(() => {
      clearAuthSession();
      setStatus("unauthenticated");
    });
  }, [queryClient, router]);

  const login = useCallback(async (body: { username: string; password: string }) => {
    const result = await authService.login(body);
    setAuthSession({ accessToken: result.access_token, user: result.user });
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Logging out is idempotent from the client's perspective. A missing or
      // expired server session must not prevent local cleanup or trigger the
      // Next.js runtime error overlay.
    } finally {
      clearAuthSession();
      queryClient.clear();
      setStatus("unauthenticated");
    }
  }, [queryClient]);

  const value = useMemo(() => ({ status, login, logout }), [status, login, logout]);
  return <QueryClientProvider client={queryClient}><AuthContext.Provider value={value}>{children}</AuthContext.Provider></QueryClientProvider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside Providers");
  return { ...value, ...getAuthSession() };
}
