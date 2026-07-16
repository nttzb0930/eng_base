import {
  CourseLessonDtoSchema,
  CourseDtoSchema,
  CourseUnitDtoSchema,
  LessonChallengeOptionDtoSchema,
  LessonChallengeDtoSchema,
  PaginatedCourseLessonsDtoSchema,
  PaginatedCoursesDtoSchema,
  PaginatedCourseUnitsDtoSchema,
  PaginatedLessonChallengeOptionsDtoSchema,
  PaginatedLessonChallengesDtoSchema,
  type CourseManagementPageQuery,
  type CreateCourseRequest,
  type CreateCourseLessonRequest,
  type CreateCourseUnitRequest,
  type CreateLessonChallengeRequest,
  type CreateLessonChallengeOptionRequest,
  type UpdateCourseRequest,
  type UpdateCourseLessonRequest,
  type UpdateCourseUnitRequest,
  type UpdateLessonChallengeRequest,
  type UpdateLessonChallengeOptionRequest,
} from "@repo/shared/courses";
import { z } from "zod";

import type { ApiEnvelope } from "@/src/lib/http-client";
import { adminHttpClient } from "@/src/services/http/admin-http-client";

export type CourseManagementHttpClient = {
  get<T>(
    path: string,
    options?: { params?: Record<string, unknown> }
  ): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  put<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

const emptyPagination = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

function params(query: CourseManagementPageQuery): Record<string, unknown> {
  return { ...query };
}

function requireData<T>(
  response: ApiEnvelope<unknown>,
  schema: z.ZodType<T>
): T {
  if (response.data === undefined) {
    throw new Error("Course management response did not contain data");
  }

  return schema.parse(response.data);
}

export function createCourseManagementClient(http: CourseManagementHttpClient) {
  return {
    courses: {
      async listPage(query: CourseManagementPageQuery) {
        const response = await http.get<unknown>("/admin/courses", {
          params: params(query),
        });
        return response.data === undefined
          ? { data: [], pagination: emptyPagination }
          : PaginatedCoursesDtoSchema.parse(response.data);
      },
      async listAll() {
        const response = await http.get<unknown>("/admin/courses");
        return response.data === undefined
          ? []
          : z.array(CourseDtoSchema).parse(response.data);
      },
      async create(body: CreateCourseRequest) {
        return requireData(
          await http.post<unknown>("/admin/courses", body),
          CourseDtoSchema
        );
      },
      async update(id: number, body: UpdateCourseRequest) {
        return requireData(
          await http.put<unknown>(`/admin/courses/${id}`, body),
          CourseDtoSchema
        );
      },
      async remove(id: number) {
        await http.delete<unknown>(`/admin/courses/${id}`);
      },
    },
    units: {
      async listPage(query: CourseManagementPageQuery) {
        const response = await http.get<unknown>("/admin/units", {
          params: params(query),
        });
        return response.data === undefined
          ? { data: [], pagination: emptyPagination }
          : PaginatedCourseUnitsDtoSchema.parse(response.data);
      },
      async listAll() {
        const response = await http.get<unknown>("/admin/units");
        return response.data === undefined
          ? []
          : z.array(CourseUnitDtoSchema).parse(response.data);
      },
      async create(body: CreateCourseUnitRequest) {
        return requireData(
          await http.post<unknown>("/admin/units", body),
          CourseUnitDtoSchema
        );
      },
      async update(id: number, body: UpdateCourseUnitRequest) {
        return requireData(
          await http.put<unknown>(`/admin/units/${id}`, body),
          CourseUnitDtoSchema
        );
      },
      async remove(id: number) {
        await http.delete<unknown>(`/admin/units/${id}`);
      },
    },
    lessons: {
      async listPage(query: CourseManagementPageQuery) {
        const response = await http.get<unknown>("/admin/lessons", {
          params: params(query),
        });
        return response.data === undefined
          ? { data: [], pagination: emptyPagination }
          : PaginatedCourseLessonsDtoSchema.parse(response.data);
      },
      async listAll() {
        const response = await http.get<unknown>("/admin/lessons");
        return response.data === undefined
          ? []
          : z.array(CourseLessonDtoSchema).parse(response.data);
      },
      async create(body: CreateCourseLessonRequest) {
        return requireData(
          await http.post<unknown>("/admin/lessons", body),
          CourseLessonDtoSchema
        );
      },
      async update(id: number, body: UpdateCourseLessonRequest) {
        return requireData(
          await http.put<unknown>(`/admin/lessons/${id}`, body),
          CourseLessonDtoSchema
        );
      },
      async remove(id: number) {
        await http.delete<unknown>(`/admin/lessons/${id}`);
      },
    },
    challenges: {
      async listPage(query: CourseManagementPageQuery) {
        const response = await http.get<unknown>("/admin/challenges", {
          params: params(query),
        });
        return response.data === undefined
          ? { data: [], pagination: emptyPagination }
          : PaginatedLessonChallengesDtoSchema.parse(response.data);
      },
      async listAll() {
        const response = await http.get<unknown>("/admin/challenges");
        return response.data === undefined
          ? []
          : z.array(LessonChallengeDtoSchema).parse(response.data);
      },
      async create(body: CreateLessonChallengeRequest) {
        return requireData(
          await http.post<unknown>("/admin/challenges", body),
          LessonChallengeDtoSchema
        );
      },
      async update(id: number, body: UpdateLessonChallengeRequest) {
        return requireData(
          await http.put<unknown>(`/admin/challenges/${id}`, body),
          LessonChallengeDtoSchema
        );
      },
      async remove(id: number) {
        await http.delete<unknown>(`/admin/challenges/${id}`);
      },
    },
    challengeOptions: {
      async listPage(query: CourseManagementPageQuery) {
        const response = await http.get<unknown>("/admin/challengeOptions", {
          params: params(query),
        });
        return response.data === undefined
          ? { data: [], pagination: emptyPagination }
          : PaginatedLessonChallengeOptionsDtoSchema.parse(response.data);
      },
      async create(body: CreateLessonChallengeOptionRequest) {
        return requireData(
          await http.post<unknown>("/admin/challengeOptions", body),
          LessonChallengeOptionDtoSchema
        );
      },
      async update(id: number, body: UpdateLessonChallengeOptionRequest) {
        return requireData(
          await http.put<unknown>(`/admin/challengeOptions/${id}`, body),
          LessonChallengeOptionDtoSchema
        );
      },
      async remove(id: number) {
        await http.delete<unknown>(`/admin/challengeOptions/${id}`);
      },
    },
  };
}

export const courseManagementClient =
  createCourseManagementClient(adminHttpClient);
