import {
  type CreateLessonChallengePayload,
  type LessonChallenge,
  type LessonChallengeQueryParams,
  type PaginatedLessonChallengesResponse,
  type UpdateLessonChallengePayload,
} from "@repo/shared";

import { adminHttpClient } from "@/app/features/auth/api/admin-http-client";
import {
  emptyCourseManagementPage,
  requireCourseManagementData,
  type CourseManagementHttp,
} from "./course-management.http";

export const challengeKeys = {
  all: ["challenges"] as const,
  list: (query: LessonChallengeQueryParams) =>
    [...challengeKeys.all, "list", query] as const,
  allList: () => [...challengeKeys.all, "all"] as const,
};

export function createChallengeApi(http: CourseManagementHttp) {
  return {
    async listPage(query: LessonChallengeQueryParams) {
      const response = await http.get<PaginatedLessonChallengesResponse>(
        "/admin/challenges",
        {
          params: { ...query },
        }
      );
      return response.data ?? emptyCourseManagementPage;
    },
    async listAll() {
      const response = await http.get<LessonChallenge[]>("/admin/challenges");
      return response.data ?? [];
    },
    async create(body: CreateLessonChallengePayload) {
      return requireCourseManagementData(
        await http.post<LessonChallenge>("/admin/challenges", body)
      );
    },
    async update(id: number, body: UpdateLessonChallengePayload) {
      return requireCourseManagementData(
        await http.put<LessonChallenge>(`/admin/challenges/${id}`, body)
      );
    },
    async remove(id: number) {
      await http.delete<unknown>(`/admin/challenges/${id}`);
    },
  };
}

export const challengeApi = createChallengeApi(adminHttpClient);
