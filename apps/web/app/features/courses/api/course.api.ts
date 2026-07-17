import type { Course, CourseDetails } from "@repo/shared";

import { webHttpClient } from "@/src/lib/web-http-client";

export type CourseHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export function createCourseApi(http: CourseHttp) {
  return {
    async list() {
      return (await http.get<Course[]>("/courses")).data;
    },

    async detail(id: number) {
      return (await http.get<CourseDetails | null>(`/courses/${id}`)).data;
    },
  };
}

export const courseApi = createCourseApi(webHttpClient);
