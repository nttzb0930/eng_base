import type { UnitWithLessons } from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export type UnitHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export function createUnitApi(http: UnitHttp) {
  return {
    async list() {
      return (await http.get<UnitWithLessons[]>("/units")).data;
    },
  };
}

export const unitApi = createUnitApi(webHttpClient);
