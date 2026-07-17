import type {
  DailyReviewChallenge,
  ReviewSummary,
  SavedWordReviewChallenge,
  SavedWordsReviewSummary,
} from "@repo/shared";

import { webHttpClient } from "@/src/lib/web-http-client";

export type ReviewHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export type SavedWordsReviewMode = "all" | "due";

export function createReviewApi(http: ReviewHttp) {
  return {
    async getDailySummary() {
      return (await http.get<ReviewSummary>("/review/daily/summary")).data;
    },

    async listDailyChallenges() {
      return (
        await http.get<DailyReviewChallenge[]>("/review/daily/challenges")
      ).data;
    },

    async getSavedSummary() {
      return (await http.get<SavedWordsReviewSummary>("/review/saved/summary")).data;
    },

    async listSavedChallenges(mode: SavedWordsReviewMode = "all") {
      return (
        await http.get<SavedWordReviewChallenge[]>(
          `/review/saved/challenges?mode=${mode}`,
        )
      ).data;
    },
  };
}

export const reviewApi = createReviewApi(webHttpClient);
