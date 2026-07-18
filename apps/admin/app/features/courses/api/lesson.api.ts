import {
  type CourseLesson,
  type CourseLessonQueryParams,
  type CreateCourseLessonPayload,
  type PaginatedCourseLessonsResponse,
  type UpdateCourseLessonPayload,
} from "@repo/shared";

import { adminHttpClient } from "@/app/features/auth/api/admin-http-client";
import {
  emptyCourseManagementPage,
  requireCourseManagementData,
  type CourseManagementHttp,
} from "./course-management.http";

export const lessonKeys = {
  all: ["lessons"] as const,
  list: (query: CourseLessonQueryParams) =>
    [...lessonKeys.all, "list", query] as const,
  allList: () => [...lessonKeys.all, "all"] as const,
};

export function createLessonApi(http: CourseManagementHttp) {
  return {
    async listPage(query: CourseLessonQueryParams) {
      const response = await http.get<PaginatedCourseLessonsResponse>(
        "/admin/lessons",
        {
          params: { ...query },
        }
      );
      return response.data ?? emptyCourseManagementPage;
    },
    async listAll() {
      const response = await http.get<CourseLesson[]>("/admin/lessons");
      return response.data ?? [];
    },
    async create(body: CreateCourseLessonPayload) {
      return requireCourseManagementData(
        await http.post<CourseLesson>("/admin/lessons", body)
      );
    },
    async update(id: number, body: UpdateCourseLessonPayload) {
      return requireCourseManagementData(
        await http.put<CourseLesson>(`/admin/lessons/${id}`, body)
      );
    },
    async remove(id: number) {
      await http.delete<unknown>(`/admin/lessons/${id}`);
    },
  };
}

export const lessonApi = createLessonApi(adminHttpClient);
