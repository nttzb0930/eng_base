import type { LessonDetails } from "@repo/shared/learning";

import { webHttpClient } from "@/src/lib/web-http-client";

export type LessonHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export function createLessonApi(http: LessonHttp) {
  return {
    async get(id?: number) {
      const query = id ? `?id=${id}` : "";
      return (await http.get<LessonDetails | null>(`/lessons${query}`)).data;
    },
  };
}

export const lessonApi = createLessonApi(webHttpClient);
