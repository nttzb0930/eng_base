import { webHttpClient } from "@/app/features/auth/api/web-http-client";

import type { LoginBody, LoginResponse, RegisterBody } from "../types/auth.types";

export type AuthHttp = {
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
};

export function createAuthApi(http: AuthHttp) {
  return {
    async login(body: LoginBody) {
      return (await http.post<LoginResponse>("/auth/login", body)).data;
    },

    async register(body: RegisterBody) {
      await http.post("/auth/register", body);
    },

    async refresh() {
      return (await http.post<LoginResponse>("/auth/refresh")).data;
    },

    async logout() {
      await http.post("/auth/logout");
    },
  };
}

export const authApi = createAuthApi(webHttpClient);
