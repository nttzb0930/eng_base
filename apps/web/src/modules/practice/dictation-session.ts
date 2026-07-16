import { cache } from "react";
import type {
  DictationPracticeChallenge,
  PracticeLevelSummary,
} from "@repo/shared/practice";

import { apiRequest } from "@/src/lib/api-client";

export type { DictationPracticeChallenge };

export const getDictationPracticeLevelSummary = cache(() =>
  apiRequest<PracticeLevelSummary>("/practice/dictation/summary")
);

export const getDictationPracticeChallenges = cache(
  (level?: string, lesson?: string) => {
    const query = new URLSearchParams();
    if (level) query.set("level", level);
    if (lesson) query.set("lesson", lesson);
    return apiRequest<DictationPracticeChallenge[]>(
      `/practice/dictation/challenges?${query}`
    );
  }
);
