"use client";

import type {
  ToeicListeningDraftPayload,
  ToeicListeningAnswerCheckPayload,
  ToeicListeningPart,
  ToeicListeningSubmissionPayload,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  toeicListeningApi,
  toeicListeningKeys,
} from "../api/toeic-listening.api";

export function useToeicListeningOverview() {
  return useQuery({
    queryKey: toeicListeningKeys.overview(),
    queryFn: () => toeicListeningApi.overview(),
  });
}

export function useToeicListeningTests(part?: ToeicListeningPart) {
  return useQuery({
    queryKey: toeicListeningKeys.tests(part),
    queryFn: () => toeicListeningApi.tests(part),
  });
}

export function useToeicListeningTest(
  testId: number,
  part?: ToeicListeningPart
) {
  return useQuery({
    queryKey: toeicListeningKeys.test(testId, part),
    queryFn: () => toeicListeningApi.test(testId, part),
    enabled: Number.isInteger(testId) && testId > 0,
  });
}

export function useCheckToeicListeningAnswer() {
  return useMutation({
    mutationFn: ({
      testId,
      payload,
    }: {
      testId: number;
      payload: ToeicListeningAnswerCheckPayload;
    }) => toeicListeningApi.checkAnswer(testId, payload),
  });
}

export function useToeicListeningDraft(
  testId: number,
  part?: ToeicListeningPart
) {
  return useQuery({
    queryKey: toeicListeningKeys.draft(testId, part),
    queryFn: () => toeicListeningApi.draft(testId, part),
    enabled: Number.isInteger(testId) && testId > 0,
  });
}

export function useSaveToeicListeningDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      testId,
      payload,
    }: {
      testId: number;
      payload: ToeicListeningDraftPayload;
    }) => toeicListeningApi.saveDraft(testId, payload),
    onSuccess: (draft) => {
      queryClient.setQueryData(
        toeicListeningKeys.draft(draft.testId, draft.practicePart),
        draft
      );
      return queryClient.invalidateQueries({
        queryKey: toeicListeningKeys.testsRoot(),
      });
    },
  });
}

export function useDeleteToeicListeningDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      testId,
      part,
    }: {
      testId: number;
      part?: ToeicListeningPart;
    }) => toeicListeningApi.deleteDraft(testId, part),
    onSuccess: (_result, variables) => {
      queryClient.setQueryData(
        toeicListeningKeys.draft(variables.testId, variables.part),
        null
      );
      return queryClient.invalidateQueries({
        queryKey: toeicListeningKeys.testsRoot(),
      });
    },
  });
}

export function useToeicListeningAttempts(part?: ToeicListeningPart) {
  return useQuery({
    queryKey: toeicListeningKeys.attempts(part),
    queryFn: () => toeicListeningApi.attempts(part),
  });
}

export function useToeicListeningAttempt(attemptId: number) {
  return useQuery({
    queryKey: toeicListeningKeys.attempt(attemptId),
    queryFn: () => toeicListeningApi.attempt(attemptId),
    enabled: Number.isInteger(attemptId) && attemptId > 0,
  });
}

export function useSubmitToeicListeningAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ToeicListeningSubmissionPayload) =>
      toeicListeningApi.submit(body),
    onSuccess: (result, submission) => {
      queryClient.setQueryData(
        toeicListeningKeys.draft(submission.testId, submission.practicePart),
        null
      );
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: toeicListeningKeys.overview(),
        }),
        queryClient.invalidateQueries({
          queryKey: toeicListeningKeys.testsRoot(),
        }),
        queryClient.invalidateQueries({
          queryKey: toeicListeningKeys.attemptsRoot(),
        }),
        queryClient.invalidateQueries({
          queryKey: toeicListeningKeys.attempt(result.id),
        }),
      ]);
    },
  });
}
