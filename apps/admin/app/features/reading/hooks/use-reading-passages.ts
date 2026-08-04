"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateReadingPassagePayload,
  UpdateReadingPassagePayload,
} from "@repo/shared";

import {
  readingPassageApi,
  readingPassageKeys,
} from "../api/reading-passage.api";

export function useReadingPassages() {
  return useQuery({
    queryKey: readingPassageKeys.list(),
    queryFn: readingPassageApi.list,
  });
}

export function useReadingTopicOptions() {
  return useQuery({
    queryKey: readingPassageKeys.topics(),
    queryFn: readingPassageApi.topicOptions,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateReadingPassage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReadingPassagePayload) =>
      readingPassageApi.create(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: readingPassageKeys.all }),
  });
}

export function useUpdateReadingPassage(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateReadingPassagePayload) =>
      readingPassageApi.update(id ?? 0, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: readingPassageKeys.all }),
  });
}

export function useSetReadingPublication(action: "publish" | "unpublish") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => readingPassageApi[action](id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: readingPassageKeys.all }),
  });
}
