import { CEFR_LEVELS } from "@repo/shared";
import type { PracticeCefrLevel } from "@repo/shared";

export type { PracticeCefrLevel };

export const PRACTICE_WORDS_PER_LESSON = 15;
export const PRACTICE_CEFR_LEVELS: PracticeCefrLevel[] = [...CEFR_LEVELS];

export const normalizePracticeCefrLevel = (value?: string | null) => {
  return value && PRACTICE_CEFR_LEVELS.includes(value as PracticeCefrLevel)
    ? (value as PracticeCefrLevel)
    : undefined;
};

export const normalizePracticeLessonNumber = (value?: string | null) => {
  const parsed = value ? Number(value) : 1;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};
