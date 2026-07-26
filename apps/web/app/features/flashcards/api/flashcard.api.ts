import type { FlashcardSummary, VocabularyItem } from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

import type { FlashcardSessionRequest } from "../flashcard-deck";

export type FlashcardHttp = {
  get<T>(path: string): Promise<{ data: T }>;
};

export function createFlashcardApi(http: FlashcardHttp) {
  return {
    async getSummary() {
      return (await http.get<FlashcardSummary>("/flashcards/summary")).data;
    },

    async getSession(request: FlashcardSessionRequest) {
      const query = new URLSearchParams();

      if ("deck" in request) {
        query.set("deck", request.deck);
      } else {
        query.set("source", request.source);
        query.set("slug", request.slug);
      }

      return (
        await http.get<VocabularyItem[]>(
          `/flashcards/session?${query.toString()}`,
        )
      ).data;
    },
  };
}

export const flashcardApi = createFlashcardApi(webHttpClient);
