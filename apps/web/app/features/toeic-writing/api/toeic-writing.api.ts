import type {
  ToeicWritingDraft,
  ToeicWritingDraftPayload,
  ToeicWritingOverview,
  ToeicWritingPart,
  ToeicWritingSubmissionPayload,
  ToeicWritingSubmissionResult,
  ToeicWritingTaskDetail,
  ToeicWritingTaskSummary,
} from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export type ToeicWritingHttp = {
  get<T>(path: string): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
  put<T>(path: string, body?: unknown): Promise<{ data: T }>;
  delete<T>(path: string): Promise<{ data: T }>;
};

export const toeicWritingKeys = {
  all: ["toeic-writing"] as const,
  overview: () => [...toeicWritingKeys.all, "overview"] as const,
  tasksRoot: () => [...toeicWritingKeys.all, "tasks"] as const,
  tasks: (part: ToeicWritingPart) =>
    [...toeicWritingKeys.tasksRoot(), part] as const,
  task: (taskId: number) => [...toeicWritingKeys.all, "task", taskId] as const,
  draft: (taskId: number) =>
    [...toeicWritingKeys.all, "draft", taskId] as const,
  submissionsRoot: () => [...toeicWritingKeys.all, "submission"] as const,
  submission: (submissionId: number) =>
    [...toeicWritingKeys.submissionsRoot(), submissionId] as const,
};

export function createToeicWritingApi(http: ToeicWritingHttp) {
  return {
    async overview() {
      return (await http.get<ToeicWritingOverview>("/toeic/writing/overview"))
        .data;
    },
    async tasks(part: ToeicWritingPart) {
      return (
        await http.get<ToeicWritingTaskSummary[]>(
          `/toeic/writing/tasks?part=${part}`
        )
      ).data;
    },
    async task(taskId: number) {
      return (
        await http.get<ToeicWritingTaskDetail>(`/toeic/writing/tasks/${taskId}`)
      ).data;
    },
    async draft(taskId: number) {
      return (
        await http.get<ToeicWritingDraft | null>(
          `/toeic/writing/tasks/${taskId}/draft`
        )
      ).data;
    },
    async saveDraft(taskId: number, body: ToeicWritingDraftPayload) {
      return (
        await http.put<ToeicWritingDraft>(
          `/toeic/writing/tasks/${taskId}/draft`,
          body
        )
      ).data;
    },
    async deleteDraft(taskId: number) {
      return (
        await http.delete<{ deleted: boolean }>(
          `/toeic/writing/tasks/${taskId}/draft`
        )
      ).data;
    },
    async submit(taskId: number, body: ToeicWritingSubmissionPayload) {
      return (
        await http.post<ToeicWritingSubmissionResult>(
          `/toeic/writing/tasks/${taskId}/submissions`,
          body
        )
      ).data;
    },
    async submission(submissionId: number) {
      return (
        await http.get<ToeicWritingSubmissionResult>(
          `/toeic/writing/submissions/${submissionId}`
        )
      ).data;
    },
  };
}

export const toeicWritingApi = createToeicWritingApi(webHttpClient);
