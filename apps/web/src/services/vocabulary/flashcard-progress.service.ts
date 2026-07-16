import { clientApiRequest } from "@/src/lib/client-api-request";
import type { FlashcardRating } from "@/src/modules/vocabulary/progress";

export const recordFlashcardRating = (vocabularyItemId: number, rating: FlashcardRating) =>
  clientApiRequest<unknown>(`/vocabulary/${vocabularyItemId}/flashcard`, {
    method: "POST", body: { rating },
  });
