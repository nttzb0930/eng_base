import type { ApiEnvelope } from "@/app/features/auth/api/http-client";
import { adminHttpClient } from "@/app/features/auth/api/admin-http-client";

export type SettingHttp = {
  get<T>(path: string): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
};

export function createSettingApi(http: SettingHttp) {
  return {
    async get(key: string) {
      const response = await http.get<string>(`/admin/settings/${key}`);
      return response.data ?? "";
    },

    async update(key: string, value: string) {
      await http.post<void>(`/admin/settings/${key}`, { value });
    },
  };
}

export const settingApi = createSettingApi(adminHttpClient);
