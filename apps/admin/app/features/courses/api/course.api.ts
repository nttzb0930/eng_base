import {
  CourseDtoSchema,
  PaginatedCoursesDtoSchema,
  type CourseManagementPageQuery,
  type CreateCourseRequest,
  type UpdateCourseRequest,
} from "@repo/shared/courses";
import { z } from "zod";

import { adminHttpClient } from "@/src/services/http/admin-http-client";
import {
  emptyCourseManagementPage,
  requireCourseManagementData,
  type CourseManagementHttp,
} from "./course-management.http";

export const courseKeys = {
  all: ["courses"] as const,
  list: (query: CourseManagementPageQuery) =>
    [...courseKeys.all, "list", query] as const,
  allList: () => [...courseKeys.all, "all"] as const,
};

export function createCourseApi(http: CourseManagementHttp) {
  return {
    async listPage(query: CourseManagementPageQuery) {
      const response = await http.get<unknown>("/admin/courses", {
        params: { ...query },
      });
      return response.data === undefined
        ? emptyCourseManagementPage
        : PaginatedCoursesDtoSchema.parse(response.data);
    },
    async listAll() {
      const response = await http.get<unknown>("/admin/courses");
      return response.data === undefined
        ? []
        : z.array(CourseDtoSchema).parse(response.data);
    },
    async create(body: CreateCourseRequest) {
      return requireCourseManagementData(
        await http.post<unknown>("/admin/courses", body),
        CourseDtoSchema
      );
    },
    async update(id: number, body: UpdateCourseRequest) {
      return requireCourseManagementData(
        await http.put<unknown>(`/admin/courses/${id}`, body),
        CourseDtoSchema
      );
    },
    async remove(id: number) {
      await http.delete<unknown>(`/admin/courses/${id}`);
    },
  };
}

export const courseApi = createCourseApi(adminHttpClient);
