import { clientApiRequest } from "@/src/lib/client-api-request";

export const recordVocabularyReviewResult = (vocabularyItemId: number, correct: boolean) =>
  clientApiRequest<unknown>(`/vocabulary/${vocabularyItemId}/review`, {
    method: "POST", body: { correct },
  });
