import { apiRequest } from "@/src/lib/api-client";

export const upsertUserProgress = (courseId: number) =>
  apiRequest<void>(`/progress/courses/${courseId}`, {
    method: "POST",
  });

export const reduceHearts = (challengeId: number) =>
  apiRequest<void | { error: "practice" | "hearts" }>(
    `/progress/hearts/${challengeId}/reduce`,
    { method: "POST" }
  );

export const refillHearts = () =>
  apiRequest<void>("/progress/hearts/refill", { method: "POST" });
