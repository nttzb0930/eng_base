import { cache } from "react";
import type {
  SavedWordReviewChallenge,
  SavedWordsReviewSummary,
} from "@repo/shared";

import { apiRequest } from "@/src/lib/api-client";

export type { SavedWordReviewChallenge };
export type SavedWordsReviewMode = "all" | "due";

export const getSavedWordsReviewSummary = cache(() =>
  apiRequest<SavedWordsReviewSummary>("/review/saved/summary")
);

export const getSavedWordReviewChallenges = cache(
  (mode: SavedWordsReviewMode = "all") =>
    apiRequest<SavedWordReviewChallenge[]>(
      `/review/saved/challenges?mode=${mode}`
    )
);
