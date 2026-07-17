import type { FlashcardSummary } from "@repo/shared/flashcards";
import type { VocabularyItem } from "@repo/shared/vocabulary";

import { webHttpClient } from "@/src/lib/web-http-client";

import {
  normalizeFlashcardDeck,
  type FlashcardDeckKey,
} from "../flashcard-deck";

export type FlashcardHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export function createFlashcardApi(http: FlashcardHttp) {
  return {
    async getSummary() {
      return (await http.get<FlashcardSummary>("/flashcards/summary")).data;
    },

    async getSession(deck?: string | null) {
      const deckKey: FlashcardDeckKey = normalizeFlashcardDeck(deck);
      return (
        await http.get<VocabularyItem[]>(
          `/flashcards/session?deck=${encodeURIComponent(deckKey)}`,
        )
      ).data;
    },
  };
}

export const flashcardApi = createFlashcardApi(webHttpClient);
