import type { ApiEnvelope } from "@/src/lib/http-client";

export type AdminLoginBody = {
  username: string;
  password: string;
};

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "ADMIN";
};

export type AdminLoginResponse = {
  token: string;
  user: AdminUser;
};

export type AuthHttpClient = {
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
};

export function createAuthService(http: AuthHttpClient) {
  return {
    async login(body: AdminLoginBody) {
      const response = await http.post<AdminLoginResponse>(
        "/admin/auth/login",
        body,
      );

      if (!response.data) {
        throw new Error("Invalid login response");
      }

      return response.data;
    },
  };
}
