"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConvertReadingSourceCandidatePayload,
  RejectReadingSourceCandidatePayload,
} from "@repo/shared";

import {
  type CandidateListQuery,
  readingSourceCandidateApi,
  readingSourceCandidateKeys,
} from "../api/reading-source-candidate.api";

export function useReadingSourceCandidates(query: CandidateListQuery) {
  return useQuery({
    queryKey: readingSourceCandidateKeys.list(query),
    queryFn: () => readingSourceCandidateApi.list(query),
  });
}

export function useReadingSourceCandidate(id: number | null) {
  return useQuery({
    queryKey: readingSourceCandidateKeys.detail(id ?? 0),
    queryFn: () => readingSourceCandidateApi.detail(id ?? 0),
    enabled: id !== null,
  });
}

export function useConvertReadingSourceCandidate(id: number | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ConvertReadingSourceCandidatePayload) =>
      readingSourceCandidateApi.convert(id ?? 0, body),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: readingSourceCandidateKeys.all }),
  });
}

export function useRejectReadingSourceCandidate(id: number | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: RejectReadingSourceCandidatePayload) =>
      readingSourceCandidateApi.reject(id ?? 0, body),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: readingSourceCandidateKeys.all }),
  });
}
