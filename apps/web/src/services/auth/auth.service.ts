import { webHttpClient } from "@/src/lib/web-http-client";
import type { AuthUser } from "@/src/stores/auth-session.store";

export type LoginResponse = { access_token: string; user: AuthUser };

export const authService = {
  async login(body: { username: string; password: string }) {
    return (await webHttpClient.post<LoginResponse>("/auth/login", body)).data;
  },
  async register(body: { username: string; email: string; password: string; fullName: string }) {
    await webHttpClient.post("/auth/register", body);
  },
  async refresh() {
    return (await webHttpClient.post<LoginResponse>("/auth/refresh")).data;
  },
  async logout() {
    await webHttpClient.post("/auth/logout");
  },
};
