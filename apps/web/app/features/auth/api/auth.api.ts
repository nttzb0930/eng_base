import { webHttpClient } from "@/app/features/auth/api/web-http-client";

import type {
  LoginBody,
  LoginResponse,
  RegisterBody,
  RegisterResponse,
  RequestPasswordResetBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from "../types/auth.types";

export type AuthHttp = {
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
};

export function createAuthApi(http: AuthHttp) {
  return {
    async login(body: LoginBody) {
      return (await http.post<LoginResponse>("/auth/login", body)).data;
    },

    async register(body: RegisterBody) {
      return (await http.post<RegisterResponse>("/auth/register", body)).data;
    },

    async verifyEmail(body: VerifyEmailBody) {
      return (await http.post("/auth/verify-email", body)).data;
    },

    async resendVerification(email: string) {
      return (await http.post("/auth/resend-verification", { email })).data;
    },

    async requestPasswordReset(body: RequestPasswordResetBody) {
      return (await http.post("/auth/forgot-password", body)).data;
    },

    async resetPassword(body: ResetPasswordBody) {
      return (await http.post("/auth/reset-password", body)).data;
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
