import type { UnitWithLessons } from "@repo/shared/learning";

import { webHttpClient } from "@/src/lib/web-http-client";

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
