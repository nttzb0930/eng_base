import {
  LessonChallengeOptionDtoSchema,
  PaginatedLessonChallengeOptionsDtoSchema,
  type CourseManagementPageQuery,
  type CreateLessonChallengeOptionRequest,
  type UpdateLessonChallengeOptionRequest,
} from "@repo/shared/courses";

import { adminHttpClient } from "@/src/services/http/admin-http-client";
import {
  emptyCourseManagementPage,
  requireCourseManagementData,
  type CourseManagementHttp,
} from "./course-management.http";

export const challengeOptionKeys = {
  all: ["challenge-options"] as const,
  list: (query: CourseManagementPageQuery) =>
    [...challengeOptionKeys.all, "list", query] as const,
};

export function createChallengeOptionApi(http: CourseManagementHttp) {
  return {
    async listPage(query: CourseManagementPageQuery) {
      const response = await http.get<unknown>("/admin/challengeOptions", {
        params: { ...query },
      });
      return response.data === undefined
        ? emptyCourseManagementPage
        : PaginatedLessonChallengeOptionsDtoSchema.parse(response.data);
    },
    async create(body: CreateLessonChallengeOptionRequest) {
      return requireCourseManagementData(
        await http.post<unknown>("/admin/challengeOptions", body),
        LessonChallengeOptionDtoSchema
      );
    },
    async update(id: number, body: UpdateLessonChallengeOptionRequest) {
      return requireCourseManagementData(
        await http.put<unknown>(`/admin/challengeOptions/${id}`, body),
        LessonChallengeOptionDtoSchema
      );
    },
    async remove(id: number) {
      await http.delete<unknown>(`/admin/challengeOptions/${id}`);
    },
  };
}

export const challengeOptionApi = createChallengeOptionApi(adminHttpClient);
