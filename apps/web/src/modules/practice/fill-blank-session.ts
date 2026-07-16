import { cache } from "react";
import type {
  FillBlankPracticeChallenge,
  PracticeCefrLevel,
  PracticeLevelSummary,
} from "@repo/shared/practice";

import { apiRequest } from "@/src/lib/api-client";

export type { FillBlankPracticeChallenge, PracticeCefrLevel };

export const PRACTICE_WORDS_PER_LESSON = 15;
export const PRACTICE_CEFR_LEVELS: PracticeCefrLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
];

export const normalizePracticeCefrLevel = (value?: string | null) => {
  return value && PRACTICE_CEFR_LEVELS.includes(value as PracticeCefrLevel)
    ? (value as PracticeCefrLevel)
    : undefined;
};

export const normalizePracticeLessonNumber = (value?: string | null) => {
  const parsed = value ? Number(value) : 1;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

export const getFillBlankPracticeLevelSummary = cache(() =>
  apiRequest<PracticeLevelSummary>("/practice/fill-blank/summary")
);

export const getFillBlankPracticeChallenges = cache(
  (level?: string, lesson?: string) => {
    const query = new URLSearchParams();
    if (level) query.set("level", level);
    if (lesson) query.set("lesson", lesson);
    return apiRequest<FillBlankPracticeChallenge[]>(
      `/practice/fill-blank/challenges?${query}`
    );
  }
);
