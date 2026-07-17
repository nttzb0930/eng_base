"use client";

import { useQuery } from "@tanstack/react-query";

import { reviewApi } from "../api/review.api";

export const reviewKeys = {
  all: ["review"] as const,
  dailySummary: ["review", "daily", "summary"] as const,
};

export function useDailyReviewSummary() {
  return useQuery({
    queryKey: reviewKeys.dailySummary,
    queryFn: reviewApi.getDailySummary,
  });
}
