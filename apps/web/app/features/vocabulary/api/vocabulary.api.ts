import type { SavedVocabularyWord } from "@repo/shared";

import { webHttpClient } from "@/src/lib/web-http-client";

export type FlashcardRating = "again" | "good";

export type VocabularyHttp = {
  get<T>(path: string): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
};

export function createVocabularyApi(http: VocabularyHttp) {
  return {
    async listSaved() {
      return (await http.get<SavedVocabularyWord[]>("/vocabulary/saved-words")).data;
    },

    async toggleSaved(vocabularyItemId: number) {
      return (
        await http.post<{ saved: boolean }>(
          `/vocabulary/${vocabularyItemId}/toggle-saved`,
        )
      ).data;
    },

    async recordReview(vocabularyItemId: number, correct: boolean) {
      return (
        await http.post<unknown>(`/vocabulary/${vocabularyItemId}/review`, {
          correct,
        })
      ).data;
    },

    async recordFlashcard(vocabularyItemId: number, rating: FlashcardRating) {
      return (
        await http.post<unknown>(`/vocabulary/${vocabularyItemId}/flashcard`, {
          rating,
        })
      ).data;
    },
  };
}

export const vocabularyApi = createVocabularyApi(webHttpClient);
