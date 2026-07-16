import type {
  PlacementTestResponse,
  SubmitAnswerResponse,
  PlacementTestQuestion,
} from "@repo/shared/placement-test";
import { apiRequest } from "@/src/lib/api-client";

export type {
  PlacementTestResponse,
  SubmitAnswerResponse,
  PlacementTestQuestion,
};

export const getNextQuestion = () =>
  apiRequest<PlacementTestResponse>("/placement-test/question");

export const submitAnswer = (challengeId: number, selectedOptionId: number) =>
  apiRequest<SubmitAnswerResponse>("/placement-test/answer", {
    method: "POST",
    body: { challengeId, selectedOptionId },
  });

export const confirmLevel = (level: string) =>
  apiRequest<{
    status: "CONFIRMED";
    confirmedLevel: string;
    activeCourseId: number;
  }>("/placement-test/confirm", {
    method: "POST",
    body: { level },
  });

export const resetTest = () =>
  apiRequest<{ status: "RESET_SUCCESS" }>("/placement-test/reset", {
    method: "POST",
  });
