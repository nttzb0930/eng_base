import {
  CourseUnitDtoSchema,
  PaginatedCourseUnitsDtoSchema,
  type CourseManagementPageQuery,
  type CreateCourseUnitRequest,
  type UpdateCourseUnitRequest,
} from "@repo/shared/courses";
import { z } from "zod";

import { adminHttpClient } from "@/src/services/http/admin-http-client";
import {
  emptyCourseManagementPage,
  requireCourseManagementData,
  type CourseManagementHttp,
} from "./course-management.http";

export const unitKeys = {
  all: ["units"] as const,
  list: (query: CourseManagementPageQuery) =>
    [...unitKeys.all, "list", query] as const,
  allList: () => [...unitKeys.all, "all"] as const,
};

export function createUnitApi(http: CourseManagementHttp) {
  return {
    async listPage(query: CourseManagementPageQuery) {
      const response = await http.get<unknown>("/admin/units", {
        params: { ...query },
      });
      return response.data === undefined
        ? emptyCourseManagementPage
        : PaginatedCourseUnitsDtoSchema.parse(response.data);
    },
    async listAll() {
      const response = await http.get<unknown>("/admin/units");
      return response.data === undefined
        ? []
        : z.array(CourseUnitDtoSchema).parse(response.data);
    },
    async create(body: CreateCourseUnitRequest) {
      return requireCourseManagementData(
        await http.post<unknown>("/admin/units", body),
        CourseUnitDtoSchema
      );
    },
    async update(id: number, body: UpdateCourseUnitRequest) {
      return requireCourseManagementData(
        await http.put<unknown>(`/admin/units/${id}`, body),
        CourseUnitDtoSchema
      );
    },
    async remove(id: number) {
      await http.delete<unknown>(`/admin/units/${id}`);
    },
  };
}

export const unitApi = createUnitApi(adminHttpClient);
