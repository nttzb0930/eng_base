import type { ApiEnvelope } from "@/src/lib/http-client";
import { adminHttpClient } from "@/src/services/http/admin-http-client";

import type { AdminLoginBody, AdminLoginResponse } from "../types/auth.types";

export type AuthHttp = {
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
};

export function createAuthApi(http: AuthHttp) {
  return {
    async login(body: AdminLoginBody) {
      const response = await http.post<AdminLoginResponse>("/admin/auth/login", body);

      if (!response.data) {
        throw new Error("Invalid login response");
      }

      return response.data;
    },
  };
}

export const authApi = createAuthApi(adminHttpClient);
