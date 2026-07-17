"use client";

import { useQuery } from "@tanstack/react-query";

import { flashcardApi } from "../api/flashcard.api";
import { normalizeFlashcardDeck } from "../flashcard-deck";

export const flashcardKeys = {
  all: ["flashcards"] as const,
  summary: ["flashcards", "summary"] as const,
  session: (deck?: string | null) =>
    ["flashcards", "session", normalizeFlashcardDeck(deck)] as const,
};

export function useFlashcardSummary() {
  return useQuery({
    queryKey: flashcardKeys.summary,
    queryFn: flashcardApi.getSummary,
  });
}

export function useFlashcardSession(deck?: string | null) {
  return useQuery({
    queryKey: flashcardKeys.session(deck),
    queryFn: () => flashcardApi.getSession(deck),
  });
}
