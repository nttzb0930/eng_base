import { clientApiRequest } from "@/src/lib/client-api-request";

export const upsertUserProgress = (courseId: number) =>
  clientApiRequest<void>(`/progress/courses/${courseId}`, { method: "POST" });

export const reduceHearts = (challengeId: number) =>
  clientApiRequest<void | { error: "practice" | "hearts" }>(
    `/progress/hearts/${challengeId}/reduce`, { method: "POST" },
  );

export const refillHearts = () =>
  clientApiRequest<void>("/progress/hearts/refill", { method: "POST" });

export const resetLessonProgress = (lessonId: number) =>
  clientApiRequest<void>(`/progress/lessons/${lessonId}/reset`, { method: "POST" });
