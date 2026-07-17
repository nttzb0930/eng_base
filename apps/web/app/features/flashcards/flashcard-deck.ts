import { CEFR_LEVELS } from "@repo/shared";
import type { PracticeCefrLevel } from "@repo/shared/practice";

export type FlashcardSource = "due" | "saved" | "weak";
export type FlashcardDeckKey = FlashcardSource | PracticeCefrLevel;

export const normalizeFlashcardDeck = (
  value?: string | null,
): FlashcardDeckKey => {
  if (value === "due" || value === "saved" || value === "weak") {
    return value;
  }

  if (CEFR_LEVELS.includes(value as PracticeCefrLevel)) {
    return value as PracticeCefrLevel;
  }

  return "due";
};

export const getFlashcardDeckTitle = (deck: FlashcardDeckKey) => {
  if (deck === "due") return "Due Review";
  if (deck === "saved") return "Saved Words";
  if (deck === "weak") return "Weak Words";

  return `${deck} Vocabulary`;
};
