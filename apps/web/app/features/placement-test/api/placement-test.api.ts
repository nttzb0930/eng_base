import { webHttpClient } from "@/src/lib/web-http-client";

import type {
  ConfirmPlacementLevelInput,
  ConfirmPlacementLevelResponse,
  PlacementTestApi,
  ResetPlacementTestResponse,
  SubmitPlacementAnswerInput,
  SubmitAnswerResponse,
  UpdateOnboardingInput,
  UpdateOnboardingResponse,
  PlacementTestResponse,
} from "../types/placement-test.types";

export type PlacementTestHttp = {
  get<T>(path: string): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
};

export function createPlacementTestApi(
  http: PlacementTestHttp,
): PlacementTestApi {
  return {
    async nextQuestion() {
      return (await http.get<PlacementTestResponse>("/placement-test/question"))
        .data;
    },

    async submitAnswer({
      challengeId,
      selectedOptionId,
    }: SubmitPlacementAnswerInput) {
      return (
        await http.post<SubmitAnswerResponse>("/placement-test/answer", {
          challengeId,
          selectedOptionId,
        })
      ).data;
    },

    async confirmLevel(input: ConfirmPlacementLevelInput) {
      return (
        await http.post<ConfirmPlacementLevelResponse>(
          "/placement-test/confirm",
          input,
        )
      ).data;
    },

    async reset() {
      return (
        await http.post<ResetPlacementTestResponse>("/placement-test/reset")
      ).data;
    },

    async updateOnboarding({ step, data }: UpdateOnboardingInput) {
      return (
        await http.post<UpdateOnboardingResponse>(
          "/placement-test/onboarding",
          { step, data },
        )
      ).data;
    },
  };
}

export const placementTestApi = createPlacementTestApi(webHttpClient);
