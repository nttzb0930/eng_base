"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ToeicReadingDraftPayload,
  ToeicReadingPart,
  ToeicReadingPracticeAnswerPayload,
  ToeicReadingPracticeSession,
  ToeicReadingPracticeStartPayload,
  ToeicReadingPracticeUpdatePayload,
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

export function useStartToeicReadingPractice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ToeicReadingPracticeStartPayload) =>
      toeicReadingApi.startPractice(body),
    onSuccess: (session) => {
      queryClient.setQueryData(toeicReadingKeys.practice(session.id), session);
    },
  });
}

export function useToeicReadingPractice(sessionId: number | null) {
  return useQuery({
    queryKey: toeicReadingKeys.practice(sessionId ?? 0),
    queryFn: () => toeicReadingApi.practice(sessionId!),
    enabled: sessionId !== null && sessionId > 0,
  });
}

export function useGradeToeicReadingPracticeAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: number;
      payload: ToeicReadingPracticeAnswerPayload;
    }) => toeicReadingApi.gradePracticeAnswer(sessionId, payload),
    onSuccess: (answer, variables) => {
      queryClient.setQueryData<ToeicReadingPracticeSession>(
        toeicReadingKeys.practice(variables.sessionId),
        (session) => {
          if (!session) return session;
          return {
            ...session,
            answers: [
              ...session.answers.filter(
                (item) => item.questionId !== answer.questionId
              ),
              answer,
            ],
            progress: answer.progress,
          };
        }
      );
    },
  });
}

export function useUpdateToeicReadingPractice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: number;
      payload: ToeicReadingPracticeUpdatePayload;
    }) => toeicReadingApi.updatePractice(sessionId, payload),
    onSuccess: (navigation, variables) => {
      queryClient.setQueryData<ToeicReadingPracticeSession>(
        toeicReadingKeys.practice(variables.sessionId),
        (session) =>
          session
            ? {
                ...session,
                activeQuestionId: navigation.activeQuestionId,
                reviewQuestionIds: navigation.reviewQuestionIds,
                updatedAt: navigation.updatedAt,
              }
            : session
      );
    },
  });
}

export function useCompleteToeicReadingPractice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) =>
      toeicReadingApi.completePractice(sessionId),
    onSuccess: (summary, sessionId) => {
      queryClient.setQueryData<ToeicReadingPracticeSession>(
        toeicReadingKeys.practice(sessionId),
        (session) =>
          session
            ? {
                ...session,
                status: "COMPLETED",
                progress: summary.progress,
                completedAt: summary.completedAt,
              }
            : session
      );
      return queryClient.invalidateQueries({
        queryKey: toeicReadingKeys.testsRoot(),
      });
    },
  });
}
