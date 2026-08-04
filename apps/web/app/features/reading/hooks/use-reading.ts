"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReadingCefrLevel, ReadingSubmissionPayload } from "@repo/shared";

import { readingApi, readingKeys } from "../api/reading.api";

export function useReadingPassages(level: ReadingCefrLevel) {
  return useQuery({
    queryKey: readingKeys.list(level),
    queryFn: () => readingApi.list(level),
  });
}

export function useReadingPassage(slug: string) {
  return useQuery({
    queryKey: readingKeys.detail(slug),
    queryFn: () => readingApi.detail(slug),
    enabled: Boolean(slug),
  });
}

export function useReadingHistory(level: ReadingCefrLevel) {
  return useQuery({
    queryKey: readingKeys.history(level),
    queryFn: () => readingApi.history(level),
  });
}

export function useReadingResult(attemptId: number) {
  return useQuery({
    queryKey: readingKeys.result(attemptId),
    queryFn: () => readingApi.result(attemptId),
    enabled: Number.isInteger(attemptId) && attemptId > 0,
  });
}

export function useSubmitReadingAttempt(passageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReadingSubmissionPayload) =>
      readingApi.submit(passageId, body),
    onSuccess: (result) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: readingKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: readingKeys.histories() }),
        queryClient.invalidateQueries({
          queryKey: readingKeys.result(result.id),
        }),
      ]),
  });
}
