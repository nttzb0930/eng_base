"use client";

import type {
  ToeicDictationPart,
  ToeicDictationSubmitPayload,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  toeicDictationApi,
  toeicDictationKeys,
} from "../api/toeic-dictation.api";

export function useToeicDictationOverview() {
  return useQuery({
    queryKey: toeicDictationKeys.overview(),
    queryFn: () => toeicDictationApi.overview(),
  });
}

export function useToeicDictationSets(options: { test?: number; part?: ToeicDictationPart } = {}) {
  return useQuery({
    queryKey: toeicDictationKeys.sets("2026", options.test, options.part),
    queryFn: () => toeicDictationApi.sets({ collection: "2026", ...options }),
  });
}

export function useToeicDictationSet(setId: number) {
  return useQuery({
    queryKey: toeicDictationKeys.set(setId),
    queryFn: () => toeicDictationApi.set(setId),
    enabled: Number.isInteger(setId) && setId > 0,
  });
}

export function useToeicDictationProgress(setId: number) {
  return useQuery({
    queryKey: toeicDictationKeys.progress(setId),
    queryFn: () => toeicDictationApi.progress(setId),
    enabled: Number.isInteger(setId) && setId > 0,
  });
}

export function useSubmitToeicDictation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: number; payload: ToeicDictationSubmitPayload }) =>
      toeicDictationApi.submit(itemId, payload),
    onSuccess: (_result, variables) =>
      queryClient.invalidateQueries({ queryKey: toeicDictationKeys.all }),
  });
}

export function useToeicDictationMedia(itemId: number) {
  return useQuery({
    queryKey: [...toeicDictationKeys.all, "media", itemId],
    queryFn: () => toeicDictationApi.media(itemId),
    enabled: Number.isInteger(itemId) && itemId > 0,
    staleTime: Infinity,
  });
}
