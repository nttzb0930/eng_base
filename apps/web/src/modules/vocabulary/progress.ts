import { apiRequest } from "@/src/lib/api-client";

export type FlashcardRating = "again" | "good";

export const recordVocabularyReviewResult = (
  vocabularyItemId: number,
  correct: boolean
) =>
  apiRequest<unknown>(`/vocabulary/${vocabularyItemId}/review`, {
    method: "POST",
    body: { correct },
  });

export const recordFlashcardRating = (
  vocabularyItemId: number,
  rating: FlashcardRating
) =>
  apiRequest<unknown>(`/vocabulary/${vocabularyItemId}/flashcard`, {
    method: "POST",
    body: { rating },
  });
