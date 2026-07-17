import {
  type CreateLessonChallengeOptionPayload,
  type LessonChallengeOption,
  type LessonChallengeOptionQueryParams,
  type PaginatedLessonChallengeOptionsResponse,
  type UpdateLessonChallengeOptionPayload,
} from "@repo/shared";

import { adminHttpClient } from "@/src/services/http/admin-http-client";
import {
  emptyCourseManagementPage,
  requireCourseManagementData,
  type CourseManagementHttp,
} from "./course-management.http";

export const challengeOptionKeys = {
  all: ["challenge-options"] as const,
  list: (query: LessonChallengeOptionQueryParams) =>
    [...challengeOptionKeys.all, "list", query] as const,
};

export function createChallengeOptionApi(http: CourseManagementHttp) {
  return {
    async listPage(query: LessonChallengeOptionQueryParams) {
      const response = await http.get<PaginatedLessonChallengeOptionsResponse>(
        "/admin/challengeOptions",
        { params: { ...query } }
      );
      return response.data ?? emptyCourseManagementPage;
    },
    async create(body: CreateLessonChallengeOptionPayload) {
      return requireCourseManagementData(
        await http.post<LessonChallengeOption>("/admin/challengeOptions", body)
      );
    },
    async update(id: number, body: UpdateLessonChallengeOptionPayload) {
      return requireCourseManagementData(
        await http.put<LessonChallengeOption>(
          `/admin/challengeOptions/${id}`,
          body
        )
      );
    },
    async remove(id: number) {
      await http.delete<unknown>(`/admin/challengeOptions/${id}`);
    },
  };
}

export const challengeOptionApi = createChallengeOptionApi(adminHttpClient);
