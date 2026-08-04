import type {
  CefrProgressSummary,
  CourseProgress,
  UserProgress,
} from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export const progressKeys = {
  all: ["progress"] as const,
  user: ["progress", "user"] as const,
  course: ["progress", "course"] as const,
  lessonPercentage: ["progress", "lesson-percentage"] as const,
  cefrLevels: ["progress", "cefr-levels"] as const,
};

export type ProgressHttp = {
  get<T>(path: string): Promise<{ data: T }>;
  post<T>(path: string): Promise<{ data: T }>;
};

export function createProgressApi(http: ProgressHttp) {
  return {
    async getUserProgress() {
      return (await http.get<UserProgress | null>("/progress/user-progress"))
        .data;
    },

    async getCourseProgress() {
      return (
        await http.get<CourseProgress | null>("/progress/course-progress")
      ).data;
    },

    async getLessonPercentage() {
      return (await http.get<number>("/progress/lesson-percentage")).data;
    },

    async getCefrLevels() {
      return (await http.get<CefrProgressSummary>("/progress/cefr-levels"))
        .data;
    },

    async selectCourse(courseId: number) {
      return (await http.post<void>(`/progress/courses/${courseId}`)).data;
    },

    async completeChallenge(challengeId: number) {
      return (
        await http.post<void | { error: "hearts" }>(
          `/progress/challenges/${challengeId}`
        )
      ).data;
    },

    async reduceHearts(challengeId: number) {
      return (
        await http.post<void | { error: "practice" | "hearts" }>(
          `/progress/hearts/${challengeId}/reduce`
        )
      ).data;
    },

    async refillHearts() {
      return (await http.post<void>("/progress/hearts/refill")).data;
    },

    async resetLesson(lessonId: number) {
      return (await http.post<void>(`/progress/lessons/${lessonId}/reset`))
        .data;
    },
  };
}

export const progressApi = createProgressApi(webHttpClient);
