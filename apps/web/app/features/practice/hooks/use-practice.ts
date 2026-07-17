"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "@/app/features/dashboard/hooks/use-dashboard";
import { reviewKeys } from "@/app/features/review/hooks/use-review";
import { vocabularyKeys } from "@/app/features/vocabulary/hooks/use-vocabulary";

import { practiceApi } from "../api/practice.api";
import type { PracticeSessionResultInput } from "../types/practice-session.types";

type PracticeChallengeQuery = {
  level?: string;
  lesson?: string | number;
};

export const practiceKeys = {
  all: ["practice"] as const,
  fillBlankSummary: ["practice", "fill-blank", "summary"] as const,
  fillBlankChallenges: (query?: PracticeChallengeQuery) =>
    ["practice", "fill-blank", "challenges", query ?? {}] as const,
  listeningSummary: ["practice", "listening", "summary"] as const,
  listeningChallenges: (query?: PracticeChallengeQuery) =>
    ["practice", "listening", "challenges", query ?? {}] as const,
  dictationSummary: ["practice", "dictation", "summary"] as const,
  dictationChallenges: (query?: PracticeChallengeQuery) =>
    ["practice", "dictation", "challenges", query ?? {}] as const,
  weakWordsSummary: ["practice", "weak-words", "summary"] as const,
  weakWordsChallenges: ["practice", "weak-words", "challenges"] as const,
};

export function useFillBlankPracticeSummary() {
  return useQuery({
    queryKey: practiceKeys.fillBlankSummary,
    queryFn: practiceApi.getFillBlankSummary,
  });
}

export function useFillBlankPracticeChallenges(query?: PracticeChallengeQuery) {
  return useQuery({
    queryKey: practiceKeys.fillBlankChallenges(query),
    queryFn: () => practiceApi.listFillBlankChallenges(query),
  });
}

export function useListeningPracticeSummary() {
  return useQuery({
    queryKey: practiceKeys.listeningSummary,
    queryFn: practiceApi.getListeningSummary,
  });
}

export function useListeningPracticeChallenges(query?: PracticeChallengeQuery) {
  return useQuery({
    queryKey: practiceKeys.listeningChallenges(query),
    queryFn: () => practiceApi.listListeningChallenges(query),
  });
}

export function useDictationPracticeSummary() {
  return useQuery({
    queryKey: practiceKeys.dictationSummary,
    queryFn: practiceApi.getDictationSummary,
  });
}

export function useDictationPracticeChallenges(query?: PracticeChallengeQuery) {
  return useQuery({
    queryKey: practiceKeys.dictationChallenges(query),
    queryFn: () => practiceApi.listDictationChallenges(query),
  });
}

export function useWeakWordsPracticeSummary() {
  return useQuery({
    queryKey: practiceKeys.weakWordsSummary,
    queryFn: practiceApi.getWeakWordsSummary,
  });
}

export function useWeakWordsPracticeChallenges() {
  return useQuery({
    queryKey: practiceKeys.weakWordsChallenges,
    queryFn: practiceApi.listWeakWordsChallenges,
  });
}

export function useRecordPracticeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PracticeSessionResultInput) =>
      practiceApi.recordSession(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: practiceKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      void queryClient.invalidateQueries({ queryKey: vocabularyKeys.all });
    },
  });
}
