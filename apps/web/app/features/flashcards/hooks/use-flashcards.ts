"use client";

import { useQuery } from "@tanstack/react-query";

import { flashcardApi } from "../api/flashcard.api";
import type { FlashcardSessionRequest } from "../flashcard-deck";

export const flashcardKeys = {
  all: ["flashcards"] as const,
  summary: ["flashcards", "summary"] as const,
  session: (request: FlashcardSessionRequest) =>
    ["flashcards", "session", request] as const,
};

export function useFlashcardSummary() {
  return useQuery({
    queryKey: flashcardKeys.summary,
    queryFn: flashcardApi.getSummary,
  });
}

export function useFlashcardSession(request: FlashcardSessionRequest) {
  return useQuery({
    queryKey: flashcardKeys.session(request),
    queryFn: () => flashcardApi.getSession(request),
  });
}
