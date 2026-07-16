import type {
  PlacementTestResponse,
  SubmitAnswerResponse,
} from "@repo/shared/placement-test";
import { clientApiRequest } from "@/src/lib/client-api-request";

export const getNextQuestionAction = () => clientApiRequest<PlacementTestResponse>("/placement-test/question");
export const submitAnswerAction = (challengeId: number, selectedOptionId: number) =>
  clientApiRequest<SubmitAnswerResponse>("/placement-test/answer", {
    method: "POST", body: { challengeId, selectedOptionId },
  });
export const confirmLevelAction = (
  level: string,
  languages?: string[],
  goals?: string[],
  intensity?: string,
  primaryLanguage?: string,
  customGoal?: string,
) =>
  clientApiRequest<{ status: "CONFIRMED"; confirmedLevel: string; activeCourseId: number }>(
    "/placement-test/confirm", {
      method: "POST",
      body: { level, languages, goals, intensity, primaryLanguage, customGoal },
    },
  );
export const resetTestAction = () =>
  clientApiRequest<{ status: "RESET_SUCCESS" }>("/placement-test/reset", { method: "POST" });

export const updateOnboardingAction = (step: number, data: any) =>
  clientApiRequest<{ onboarding_step: number; onboarding_data: any }>("/placement-test/onboarding", {
    method: "POST",
    body: { step, data },
  });
