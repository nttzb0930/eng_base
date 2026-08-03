"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  ToeicWritingCoachingKind,
  ToeicWritingDraftPayload,
  ToeicWritingPart,
  ToeicWritingPartOneGradeRequest,
  ToeicWritingSubmissionPayload,
} from "@repo/shared";

import { toeicWritingApi, toeicWritingKeys } from "../api/toeic-writing.api";
import { canLoadToeicWritingCoaching } from "../toeic-writing-coaching-state";

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

export function useToeicWritingAiQuota(enabled = true) {
  return useQuery({
    queryKey: toeicWritingKeys.quota(),
    queryFn: () => toeicWritingApi.quota(),
    enabled,
  });
}

export function useGradeToeicWritingPartOne() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: number;
      payload: ToeicWritingPartOneGradeRequest;
    }) => toeicWritingApi.gradePartOne(taskId, payload),
    onSuccess: (grade) => {
      queryClient.setQueryData(toeicWritingKeys.grade(grade.id), grade);
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: toeicWritingKeys.grades(grade.taskId),
        }),
        queryClient.invalidateQueries({ queryKey: toeicWritingKeys.quota() }),
      ]);
    },
  });
}

export function useToeicWritingGradeHistory(taskId: number, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: toeicWritingKeys.grades(taskId),
    queryFn: ({ pageParam }) => toeicWritingApi.gradeHistory(taskId, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

export function useRecordToeicWritingAssistance() {
  return useMutation({
    mutationFn: ({
      taskId,
      kind,
      contentVersion,
    }: {
      taskId: number;
      kind: ToeicWritingCoachingKind | "COMMUNITY_RESTORE";
      contentVersion: string;
    }) => toeicWritingApi.recordAssistance(taskId, kind, { contentVersion }),
  });
}

export function useToeicWritingCoaching(
  taskId: number,
  contentVersion: string,
  kind: ToeicWritingCoachingKind,
  open: boolean
) {
  return useQuery({
    queryKey: toeicWritingKeys.coaching(taskId, contentVersion, kind),
    queryFn: () => toeicWritingApi.coaching(taskId, contentVersion, kind),
    enabled: canLoadToeicWritingCoaching(taskId, contentVersion, open),
  });
}

export function useToeicWritingCommunity(taskId: number, open: boolean) {
  return useInfiniteQuery({
    queryKey: toeicWritingKeys.community(taskId),
    queryFn: ({ pageParam }) => toeicWritingApi.community(taskId, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: open && Number.isInteger(taskId) && taskId > 0,
  });
}

export function useShareToeicWritingSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId }: { submissionId: number; taskId: number }) =>
      toeicWritingApi.share(submissionId),
    onSuccess: (_result, variables) =>
      queryClient.invalidateQueries({
        queryKey: toeicWritingKeys.community(variables.taskId),
      }),
  });
}

export function useUnshareToeicWritingSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId }: { submissionId: number; taskId: number }) =>
      toeicWritingApi.unshare(submissionId),
    onSuccess: (_result, variables) =>
      queryClient.invalidateQueries({
        queryKey: toeicWritingKeys.community(variables.taskId),
      }),
  });
}

export function useRestoreToeicWritingCommunityResponse() {
  return useMutation({
    mutationFn: ({
      taskId,
      submissionId,
      contentVersion,
    }: {
      taskId: number;
      submissionId: number;
      contentVersion: string;
    }) =>
      toeicWritingApi.restoreCommunity(taskId, submissionId, contentVersion),
  });
}
