import { cache } from "react";
import type {
  WeakWordsPracticeChallenge,
  WeakWordsSummary,
} from "@repo/shared";

import { apiRequest } from "@/src/lib/api-client";

export type { WeakWordsPracticeChallenge };

export const getWeakWordsPracticeSummary = cache(() =>
  apiRequest<WeakWordsSummary>("/practice/weak-words/summary")
);

export const getWeakWordsPracticeChallenges = cache(() =>
  apiRequest<WeakWordsPracticeChallenge[]>(
    "/practice/weak-words/challenges"
  )
);
