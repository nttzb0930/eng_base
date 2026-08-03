"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ToeicWritingDraftPayload,
  ToeicWritingPart,
  ToeicWritingSubmissionPayload,
} from "@repo/shared";

import { toeicWritingApi, toeicWritingKeys } from "../api/toeic-writing.api";

export function useToeicWritingOverview() {
  return useQuery({
    queryKey: toeicWritingKeys.overview(),
    queryFn: () => toeicWritingApi.overview(),
  });
}

export function useToeicWritingTasks(part: ToeicWritingPart) {
  return useQuery({
    queryKey: toeicWritingKeys.tasks(part),
    queryFn: () => toeicWritingApi.tasks(part),
    placeholderData: (previousData) => previousData,
  });
}

export function useToeicWritingTask(taskId: number) {
  return useQuery({
    queryKey: toeicWritingKeys.task(taskId),
    queryFn: () => toeicWritingApi.task(taskId),
    enabled: Number.isInteger(taskId) && taskId > 0,
  });
}

export function useToeicWritingDraft(taskId: number) {
  return useQuery({
    queryKey: toeicWritingKeys.draft(taskId),
    queryFn: () => toeicWritingApi.draft(taskId),
    enabled: Number.isInteger(taskId) && taskId > 0,
  });
}

export function useSaveToeicWritingDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number;
      payload: ToeicWritingDraftPayload;
    }) => toeicWritingApi.saveDraft(taskId, payload),
    onSuccess: (draft) => {
      queryClient.setQueryData(toeicWritingKeys.draft(draft.taskId), draft);
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: toeicWritingKeys.tasksRoot(),
        }),
        queryClient.invalidateQueries({
          queryKey: toeicWritingKeys.overview(),
        }),
      ]);
    },
  });
}

export function useDeleteToeicWritingDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => toeicWritingApi.deleteDraft(taskId),
    onSuccess: (_result, taskId) => {
      queryClient.setQueryData(toeicWritingKeys.draft(taskId), null);
      return queryClient.invalidateQueries({
        queryKey: toeicWritingKeys.tasksRoot(),
      });
    },
  });
}

export function useSubmitToeicWriting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number;
      payload: ToeicWritingSubmissionPayload;
    }) => toeicWritingApi.submit(taskId, payload),
    onSuccess: (submission) => {
      queryClient.setQueryData(
        toeicWritingKeys.submission(submission.id),
        submission
      );
      queryClient.setQueryData(toeicWritingKeys.draft(submission.taskId), null);
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: toeicWritingKeys.tasksRoot(),
        }),
        queryClient.invalidateQueries({
          queryKey: toeicWritingKeys.overview(),
        }),
      ]);
    },
  });
}

export function useToeicWritingSubmission(submissionId: number) {
  return useQuery({
    queryKey: toeicWritingKeys.submission(submissionId),
    queryFn: () => toeicWritingApi.submission(submissionId),
    enabled: Number.isInteger(submissionId) && submissionId > 0,
  });
}
