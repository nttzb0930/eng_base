import { cache } from "react";
import type {
  FlashcardSummary,
  PracticeCefrLevel,
  VocabularyItem,
} from "@repo/shared";

import { apiRequest } from "@/src/lib/api-client";

export type FlashcardSource = "due" | "saved" | "weak";
export type FlashcardDeckKey = FlashcardSource | PracticeCefrLevel;

export const normalizeFlashcardDeck = (value?: string | null) => {
  if (
    value === "due" ||
    value === "saved" ||
    value === "weak" ||
    value === "A1" ||
    value === "A2" ||
    value === "B1" ||
    value === "B2"
  ) {
    return value;
  }
  return "due" as const;
};

export const getFlashcardDeckSummary = cache(() =>
  apiRequest<FlashcardSummary>("/flashcards/summary")
);

export const getFlashcardSessionItems = cache((deck?: string) =>
  apiRequest<VocabularyItem[]>(
    `/flashcards/session?deck=${encodeURIComponent(deck ?? "due")}`
  )
);

export const getFlashcardDeckTitle = (deck: FlashcardDeckKey) => {
  if (deck === "due") return "Due Review";
  if (deck === "saved") return "Saved Words";
  if (deck === "weak") return "Weak Words";
  return `${deck} Vocabulary`;
};
