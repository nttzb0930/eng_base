import { adminHttpClient } from "@/src/services/http/admin-http-client";

export const settingsService = {
  getSetting: async (key: string): Promise<string> => {
    const res = await adminHttpClient.get<string>(`/admin/settings/${key}`);
    return res.data ?? "";
  },
  updateSetting: async (key: string, value: string): Promise<void> => {
    await adminHttpClient.post<void>(`/admin/settings/${key}`, { value });
  },
};
