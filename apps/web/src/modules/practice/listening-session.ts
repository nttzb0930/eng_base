import { cache } from "react";
import type {
  ListeningPracticeChallenge,
  PracticeLevelSummary,
} from "@repo/shared";

import { apiRequest } from "@/src/lib/api-client";

export type { ListeningPracticeChallenge };

export const getListeningPracticeLevelSummary = cache(() =>
  apiRequest<PracticeLevelSummary>("/practice/listening/summary")
);

export const getListeningPracticeChallenges = cache(
  (level?: string, lesson?: string) => {
    const query = new URLSearchParams();
    if (level) query.set("level", level);
    if (lesson) query.set("lesson", lesson);
    return apiRequest<ListeningPracticeChallenge[]>(
      `/practice/listening/challenges?${query}`
    );
  }
);
