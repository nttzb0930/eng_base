"use client";

import { useQuery } from "@tanstack/react-query";

import {
  reviewApi,
  type SavedWordsReviewMode,
} from "../api/review.api";

export const reviewKeys = {
  all: ["review"] as const,
  dailySummary: ["review", "daily", "summary"] as const,
  dailyChallenges: ["review", "daily", "challenges"] as const,
  savedSummary: ["review", "saved", "summary"] as const,
  savedChallenges: (mode: SavedWordsReviewMode) =>
    ["review", "saved", "challenges", mode] as const,
};

export function useDailyReviewSummary() {
  return useQuery({
    queryKey: reviewKeys.dailySummary,
    queryFn: reviewApi.getDailySummary,
  });
}

export function useDailyReviewChallenges() {
  return useQuery({
    queryKey: reviewKeys.dailyChallenges,
    queryFn: reviewApi.listDailyChallenges,
  });
}

export function useSavedWordsReviewSummary() {
  return useQuery({
    queryKey: reviewKeys.savedSummary,
    queryFn: reviewApi.getSavedSummary,
  });
}

export function useSavedWordsReviewChallenges(mode: SavedWordsReviewMode) {
  return useQuery({
    queryKey: reviewKeys.savedChallenges(mode),
    queryFn: () => reviewApi.listSavedChallenges(mode),
  });
}
