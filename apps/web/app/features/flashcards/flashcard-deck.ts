import type { PracticeCefrLevel } from "@repo/shared";

export type FlashcardSource = "due" | "saved" | "weak";
export type FlashcardDeckKey = FlashcardSource | PracticeCefrLevel | (string & {});

export const normalizeFlashcardDeck = (
  value?: string | null,
): string => {
  if (!value) return "due";
  return value;
};

export const getFlashcardDeckTitle = (deck: FlashcardDeckKey) => {
  if (deck === "due") return "Due Review";
  if (deck === "saved") return "Saved Words";
  if (deck === "weak") return "Weak Words";

  return `${deck} Vocabulary`;
};
