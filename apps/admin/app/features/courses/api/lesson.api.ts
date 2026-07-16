import {
  CourseLessonDtoSchema,
  PaginatedCourseLessonsDtoSchema,
  type CourseManagementPageQuery,
  type CreateCourseLessonRequest,
  type UpdateCourseLessonRequest,
} from "@repo/shared/courses";
import { z } from "zod";

import { adminHttpClient } from "@/src/services/http/admin-http-client";
import {
  emptyCourseManagementPage,
  requireCourseManagementData,
  type CourseManagementHttp,
} from "./course-management.http";

export const lessonKeys = {
  all: ["lessons"] as const,
  list: (query: CourseManagementPageQuery) =>
    [...lessonKeys.all, "list", query] as const,
  allList: () => [...lessonKeys.all, "all"] as const,
};

export function createLessonApi(http: CourseManagementHttp) {
  return {
    async listPage(query: CourseManagementPageQuery) {
      const response = await http.get<unknown>("/admin/lessons", {
        params: { ...query },
      });
      return response.data === undefined
        ? emptyCourseManagementPage
        : PaginatedCourseLessonsDtoSchema.parse(response.data);
    },
    async listAll() {
      const response = await http.get<unknown>("/admin/lessons");
      return response.data === undefined
        ? []
        : z.array(CourseLessonDtoSchema).parse(response.data);
    },
    async create(body: CreateCourseLessonRequest) {
      return requireCourseManagementData(
        await http.post<unknown>("/admin/lessons", body),
        CourseLessonDtoSchema
      );
    },
    async update(id: number, body: UpdateCourseLessonRequest) {
      return requireCourseManagementData(
        await http.put<unknown>(`/admin/lessons/${id}`, body),
        CourseLessonDtoSchema
      );
    },
    async remove(id: number) {
      await http.delete<unknown>(`/admin/lessons/${id}`);
    },
  };
}

export const lessonApi = createLessonApi(adminHttpClient);
