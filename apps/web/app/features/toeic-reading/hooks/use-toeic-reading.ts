"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ToeicReadingDraftPayload,
  ToeicReadingPart,
  ToeicReadingSubmissionPayload,
} from "@repo/shared";

import { toeicReadingApi, toeicReadingKeys } from "../api/toeic-reading.api";

export function useToeicReadingOverview() {
  return useQuery({
    queryKey: toeicReadingKeys.overview(),
    queryFn: () => toeicReadingApi.overview(),
  });
}

export function useToeicReadingTests(part?: ToeicReadingPart) {
  return useQuery({
    queryKey: toeicReadingKeys.tests(part),
    queryFn: () => toeicReadingApi.tests(part),
  });
}

export function useToeicReadingTest(testId: number, part?: ToeicReadingPart) {
  return useQuery({
    queryKey: toeicReadingKeys.test(testId, part),
    queryFn: () => toeicReadingApi.test(testId, part),
    enabled: Number.isInteger(testId) && testId > 0,
  });
}

export function useToeicReadingDraft(testId: number, part?: ToeicReadingPart) {
  return useQuery({
    queryKey: toeicReadingKeys.draft(testId, part),
    queryFn: () => toeicReadingApi.draft(testId, part),
    enabled: Number.isInteger(testId) && testId > 0,
  });
}

export function useSaveToeicReadingDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      testId,
      payload,
    }: {
      testId: number;
      payload: ToeicReadingDraftPayload;
    }) => toeicReadingApi.saveDraft(testId, payload),
    onSuccess: (draft) => {
      queryClient.setQueryData(
        toeicReadingKeys.draft(draft.testId, draft.practicePart),
        draft
      );
      return queryClient.invalidateQueries({
        queryKey: toeicReadingKeys.testsRoot(),
      });
    },
  });
}

export function useDeleteToeicReadingDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      testId,
      part,
    }: {
      testId: number;
      part?: ToeicReadingPart;
    }) => toeicReadingApi.deleteDraft(testId, part),
    onSuccess: (_result, variables) => {
      queryClient.setQueryData(
        toeicReadingKeys.draft(variables.testId, variables.part),
        null
      );
      return queryClient.invalidateQueries({
        queryKey: toeicReadingKeys.testsRoot(),
      });
    },
  });
}

export function useToeicReadingAttempts(part?: ToeicReadingPart) {
  return useQuery({
    queryKey: toeicReadingKeys.attempts(part),
    queryFn: () => toeicReadingApi.attempts(part),
  });
}

export function useToeicReadingAttempt(attemptId: number) {
  return useQuery({
    queryKey: toeicReadingKeys.attempt(attemptId),
    queryFn: () => toeicReadingApi.attempt(attemptId),
    enabled: Number.isInteger(attemptId) && attemptId > 0,
  });
}

export function useSubmitToeicReadingAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ToeicReadingSubmissionPayload) =>
      toeicReadingApi.submit(body),
    onSuccess: (result, submission) => {
      queryClient.setQueryData(
        toeicReadingKeys.draft(submission.testId, submission.practicePart),
        null
      );
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: toeicReadingKeys.overview(),
        }),
        queryClient.invalidateQueries({ queryKey: toeicReadingKeys.tests() }),
        queryClient.invalidateQueries({
          queryKey: toeicReadingKeys.testsRoot(),
        }),
        queryClient.invalidateQueries({
          queryKey: toeicReadingKeys.attemptsRoot(),
        }),
        queryClient.invalidateQueries({
          queryKey: toeicReadingKeys.attempt(result.id),
        }),
      ]);
    },
  });
}
