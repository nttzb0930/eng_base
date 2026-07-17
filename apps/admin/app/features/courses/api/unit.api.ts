import {
  type CourseUnit,
  type CourseUnitQueryParams,
  type CreateCourseUnitPayload,
  type PaginatedCourseUnitsResponse,
  type UpdateCourseUnitPayload,
} from "@repo/shared";

import { adminHttpClient } from "@/src/services/http/admin-http-client";
import {
  emptyCourseManagementPage,
  requireCourseManagementData,
  type CourseManagementHttp,
} from "./course-management.http";

export const unitKeys = {
  all: ["units"] as const,
  list: (query: CourseUnitQueryParams) =>
    [...unitKeys.all, "list", query] as const,
  allList: () => [...unitKeys.all, "all"] as const,
};

export function createUnitApi(http: CourseManagementHttp) {
  return {
    async listPage(query: CourseUnitQueryParams) {
      const response = await http.get<PaginatedCourseUnitsResponse>(
        "/admin/units",
        {
          params: { ...query },
        }
      );
      return response.data ?? emptyCourseManagementPage;
    },
    async listAll() {
      const response = await http.get<CourseUnit[]>("/admin/units");
      return response.data ?? [];
    },
    async create(body: CreateCourseUnitPayload) {
      return requireCourseManagementData(
        await http.post<CourseUnit>("/admin/units", body)
      );
    },
    async update(id: number, body: UpdateCourseUnitPayload) {
      return requireCourseManagementData(
        await http.put<CourseUnit>(`/admin/units/${id}`, body)
      );
    },
    async remove(id: number) {
      await http.delete<unknown>(`/admin/units/${id}`);
    },
  };
}

export const unitApi = createUnitApi(adminHttpClient);
