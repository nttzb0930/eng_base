"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ToeicGrammarAnswerPayload,
  ToeicGrammarPracticeMode,
} from "@repo/shared";

import { toeicGrammarApi, toeicGrammarKeys } from "../api/toeic-grammar.api";

export function useToeicGrammarCatalog() {
  return useQuery({
    queryKey: toeicGrammarKeys.catalog(),
    queryFn: () => toeicGrammarApi.catalog(),
  });
}

export function useToeicGrammarSubtopic(target: string) {
  return useQuery({
    queryKey: toeicGrammarKeys.subtopic(target),
    queryFn: () => toeicGrammarApi.subtopic(target),
    enabled: target.length > 0,
  });
}

export function useToeicGrammarPractice(
  mode: ToeicGrammarPracticeMode,
  target: string
) {
  return useQuery({
    queryKey: toeicGrammarKeys.practice(mode, target),
    queryFn: () => toeicGrammarApi.practice(mode, target),
    enabled: target.length > 0,
  });
}

export function useSubmitToeicGrammarAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ToeicGrammarAnswerPayload) =>
      toeicGrammarApi.answer(body),
    onSuccess: (_result, body) => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: toeicGrammarKeys.catalog() }),
        queryClient.invalidateQueries({
          queryKey: toeicGrammarKeys.practice(body.mode, body.target),
        }),
      ]);
    },
  });
}
