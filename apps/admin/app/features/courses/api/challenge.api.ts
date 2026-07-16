import {
  LessonChallengeDtoSchema,
  PaginatedLessonChallengesDtoSchema,
  type CourseManagementPageQuery,
  type CreateLessonChallengeRequest,
  type UpdateLessonChallengeRequest,
} from "@repo/shared/courses";
import { z } from "zod";

import { adminHttpClient } from "@/src/services/http/admin-http-client";
import {
  emptyCourseManagementPage,
  requireCourseManagementData,
  type CourseManagementHttp,
} from "./course-management.http";

export const challengeKeys = {
  all: ["challenges"] as const,
  list: (query: CourseManagementPageQuery) =>
    [...challengeKeys.all, "list", query] as const,
  allList: () => [...challengeKeys.all, "all"] as const,
};

export function createChallengeApi(http: CourseManagementHttp) {
  return {
    async listPage(query: CourseManagementPageQuery) {
      const response = await http.get<unknown>("/admin/challenges", {
        params: { ...query },
      });
      return response.data === undefined
        ? emptyCourseManagementPage
        : PaginatedLessonChallengesDtoSchema.parse(response.data);
    },
    async listAll() {
      const response = await http.get<unknown>("/admin/challenges");
      return response.data === undefined
        ? []
        : z.array(LessonChallengeDtoSchema).parse(response.data);
    },
    async create(body: CreateLessonChallengeRequest) {
      return requireCourseManagementData(
        await http.post<unknown>("/admin/challenges", body),
        LessonChallengeDtoSchema
      );
    },
    async update(id: number, body: UpdateLessonChallengeRequest) {
      return requireCourseManagementData(
        await http.put<unknown>(`/admin/challenges/${id}`, body),
        LessonChallengeDtoSchema
      );
    },
    async remove(id: number) {
      await http.delete<unknown>(`/admin/challenges/${id}`);
    },
  };
}

export const challengeApi = createChallengeApi(adminHttpClient);
