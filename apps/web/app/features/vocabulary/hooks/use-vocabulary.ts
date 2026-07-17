"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "@/app/features/dashboard/hooks/use-dashboard";
import { reviewKeys } from "@/app/features/review/hooks/use-review";
import { topicKeys } from "@/app/features/topics/hooks/use-topics";

import {
  vocabularyApi,
  type FlashcardRating,
} from "../api/vocabulary.api";

export const vocabularyKeys = {
  all: ["vocabulary"] as const,
  saved: ["vocabulary", "saved"] as const,
};

function useInvalidateVocabularyConsumers() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: vocabularyKeys.all });
    void queryClient.invalidateQueries({ queryKey: topicKeys.all });
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["flashcards"] });
  };
}

export function useSavedWords() {
  return useQuery({
    queryKey: vocabularyKeys.saved,
    queryFn: vocabularyApi.listSaved,
  });
}

export function useToggleSavedWord() {
  const invalidateConsumers = useInvalidateVocabularyConsumers();

  return useMutation({
    mutationFn: (vocabularyItemId: number) =>
      vocabularyApi.toggleSaved(vocabularyItemId),
    onSuccess: invalidateConsumers,
  });
}

export function useRecordVocabularyReview() {
  const invalidateConsumers = useInvalidateVocabularyConsumers();

  return useMutation({
    mutationFn: ({
      vocabularyItemId,
      correct,
    }: {
      vocabularyItemId: number;
      correct: boolean;
    }) => vocabularyApi.recordReview(vocabularyItemId, correct),
    onSuccess: invalidateConsumers,
  });
}

export function useRecordFlashcardRating() {
  const invalidateConsumers = useInvalidateVocabularyConsumers();

  return useMutation({
    mutationFn: ({
      vocabularyItemId,
      rating,
    }: {
      vocabularyItemId: number;
      rating: FlashcardRating;
    }) => vocabularyApi.recordFlashcard(vocabularyItemId, rating),
    onSuccess: invalidateConsumers,
  });
}
