import type { DashboardStats } from "@repo/shared";

import { webHttpClient } from "@/src/lib/web-http-client";

export type DashboardHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export function createDashboardApi(http: DashboardHttp) {
  return {
    async get() {
      return (await http.get<DashboardStats>("/dashboard")).data;
    },
  };
}

export const dashboardApi = createDashboardApi(webHttpClient);
