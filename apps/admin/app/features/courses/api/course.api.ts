import {
  type Course,
  type CourseQueryParams,
  type CreateCoursePayload,
  type PaginatedCoursesResponse,
  type UpdateCoursePayload,
} from "@repo/shared";

import { adminHttpClient } from "@/src/services/http/admin-http-client";
import {
  emptyCourseManagementPage,
  requireCourseManagementData,
  type CourseManagementHttp,
} from "./course-management.http";

export const courseKeys = {
  all: ["courses"] as const,
  list: (query: CourseQueryParams) =>
    [...courseKeys.all, "list", query] as const,
  allList: () => [...courseKeys.all, "all"] as const,
};

export function createCourseApi(http: CourseManagementHttp) {
  return {
    async listPage(query: CourseQueryParams) {
      const response = await http.get<PaginatedCoursesResponse>(
        "/admin/courses",
        {
          params: { ...query },
        }
      );
      return response.data ?? emptyCourseManagementPage;
    },
    async listAll() {
      const response = await http.get<Course[]>("/admin/courses");
      return response.data ?? [];
    },
    async create(body: CreateCoursePayload) {
      return requireCourseManagementData(
        await http.post<Course>("/admin/courses", body)
      );
    },
    async update(id: number, body: UpdateCoursePayload) {
      return requireCourseManagementData(
        await http.put<Course>(`/admin/courses/${id}`, body)
      );
    },
    async remove(id: number) {
      await http.delete<unknown>(`/admin/courses/${id}`);
    },
  };
}

export const courseApi = createCourseApi(adminHttpClient);
