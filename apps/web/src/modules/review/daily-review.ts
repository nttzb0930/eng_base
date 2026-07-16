import { cache } from "react";
import type { DailyReviewChallenge, ReviewSummary } from "@repo/shared";

import { apiRequest } from "@/src/lib/api-client";

export type { DailyReviewChallenge };

export const getDailyReviewSummary = cache(() =>
  apiRequest<ReviewSummary>("/review/daily/summary")
);

export const getDailyReviewChallenges = cache(() =>
  apiRequest<DailyReviewChallenge[]>("/review/daily/challenges")
);
