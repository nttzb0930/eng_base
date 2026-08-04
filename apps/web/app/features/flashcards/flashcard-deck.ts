import type { PracticeCefrLevel } from "@repo/shared";

export type FlashcardSource = "due" | "saved" | "weak";
export type FlashcardDeckKey = FlashcardSource | PracticeCefrLevel;

export type FlashcardSessionRequest =
  | { deck: FlashcardDeckKey }
  | { source: "topic"; slug: string };

export const getFlashcardDeckTitle = (deck: FlashcardDeckKey) => {
  if (deck === "due") return "Due Review";
  if (deck === "saved") return "Saved Words";
  if (deck === "weak") return "Weak Words";

  return `${deck} Vocabulary`;
};
