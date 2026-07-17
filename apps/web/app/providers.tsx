"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { authApi } from "@/app/features/auth/api/auth.api";
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from "@/app/features/auth/hooks/use-auth";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
  subscribeAuthSession,
} from "@/app/features/auth/store/auth-session.store";
import type { LoginBody, RegisterBody } from "@/app/features/auth/types/auth.types";
import { defaultLocale, isLocale } from "@/app/i18n/config";
import { withLocale } from "@/app/i18n/paths";
import { setOnUnauthenticated } from "@/src/lib/web-http-client";

function localeFromPathname(pathname: string) {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return isLocale(firstSegment) ? firstSegment : defaultLocale;
}

function hasRefreshSession() {
  return (
    typeof document !== "undefined" &&
    document.cookie.split(";").some((item) => item.trim() === "client_has_rt=1")
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient());
  const [status, setStatus] = useState<AuthStatus>(() =>
    typeof document === "undefined" || hasRefreshSession()
      ? "loading"
      : "unauthenticated",
  );
  useSyncExternalStore(subscribeAuthSession, getAuthSession, getAuthSession);

  const redirectToSignIn = useCallback(() => {
    router.replace(withLocale("/sign-in", localeFromPathname(pathname)));
  }, [pathname, router]);

  useEffect(() => {
    setOnUnauthenticated(() => {
      queryClient.clear();
      setStatus("unauthenticated");
      redirectToSignIn();
    });

    if (!hasRefreshSession()) {
      clearAuthSession();
      return;
    }

    authApi
      .refresh()
      .then((result) => {
        setAuthSession({ accessToken: result.access_token, user: result.user });
        setStatus("authenticated");
      })
      .catch(() => {
        clearAuthSession();
        setStatus("unauthenticated");
      });
  }, [queryClient, redirectToSignIn]);

  const login = useCallback(async (body: LoginBody) => {
    const result = await authApi.login(body);
    setAuthSession({ accessToken: result.access_token, user: result.user });
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (body: RegisterBody) => {
    await authApi.register(body);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Local cleanup is still correct when the server session is absent or expired.
    } finally {
      clearAuthSession();
      queryClient.clear();
      setStatus("unauthenticated");
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, login, register, logout }),
    [status, login, register, logout],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
}
