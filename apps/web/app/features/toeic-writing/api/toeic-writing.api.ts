import type {
  ToeicWritingDraft,
  ToeicWritingDraftPayload,
  ToeicWritingCoachingKind,
  ToeicWritingCommunityPage,
  ToeicWritingOverview,
  ToeicWritingAiQuota,
  ToeicWritingGradeHistoryPage,
  ToeicWritingPartOneGradeDetail,
  ToeicWritingPartOneGradeRequest,
  ToeicWritingPartOneGradeResult,
  ToeicWritingPart,
  ToeicWritingPartTwoCoaching,
  ToeicWritingSubmissionPayload,
  ToeicWritingSubmissionResult,
  ToeicWritingTaskDetail,
  ToeicWritingTaskSummary,
} from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export type ToeicWritingHttp = {
  get<T>(path: string, config?: { responseType: "blob" }): Promise<{ data: T }>;
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
  quota: () => [...toeicWritingKeys.all, "ai-quota"] as const,
  gradesRoot: () => [...toeicWritingKeys.all, "grades"] as const,
  grades: (taskId: number) =>
    [...toeicWritingKeys.gradesRoot(), taskId] as const,
  grade: (gradeId: number) =>
    [...toeicWritingKeys.all, "grade", gradeId] as const,
  coaching: (
    taskId: number,
    version: string,
    kind: ToeicWritingCoachingKind
  ) =>
    [...toeicWritingKeys.all, "coaching", taskId, version, kind] as const,
  community: (taskId: number) =>
    [...toeicWritingKeys.all, "community", taskId] as const,
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
    async image(taskId: number) {
      return (
        await http.get<Blob>(`/toeic/writing/tasks/${taskId}/image`, {
          responseType: "blob",
        })
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
    async gradePartOne(taskId: number, body: ToeicWritingPartOneGradeRequest) {
      return (
        await http.post<ToeicWritingPartOneGradeResult>(
          `/toeic/writing/tasks/${taskId}/grades/part-one`,
          body
        )
      ).data;
    },
    async quota() {
      return (await http.get<ToeicWritingAiQuota>("/toeic/writing/ai-quota"))
        .data;
    },
    async grade(gradeId: number) {
      return (
        await http.get<ToeicWritingPartOneGradeDetail>(
          `/toeic/writing/grades/${gradeId}`
        )
      ).data;
    },
    async gradeHistory(taskId: number, cursor?: number) {
      const cursorQuery = cursor === undefined ? "" : `&cursor=${cursor}`;
      return (
        await http.get<ToeicWritingGradeHistoryPage>(
          `/toeic/writing/tasks/${taskId}/grades?limit=20${cursorQuery}`
        )
      ).data;
    },
    async recordAssistance(
      taskId: number,
      kind: ToeicWritingCoachingKind | "COMMUNITY_RESTORE",
      body: { contentVersion: string }
    ) {
      return (
        await http.post<{ recorded: true }>(
          `/toeic/writing/tasks/${taskId}/assistance/${kind}`,
          body
        )
      ).data;
    },
    async coaching(
      taskId: number,
      version: string,
      kind: ToeicWritingCoachingKind
    ) {
      return (
        await http.get<ToeicWritingPartTwoCoaching>(
          `/toeic/writing/tasks/${taskId}/coaching/${kind}?contentVersion=${encodeURIComponent(version)}`
        )
      ).data;
    },
    async community(taskId: number, cursor?: number) {
      const cursorQuery = cursor === undefined ? "" : `&cursor=${cursor}`;
      return (
        await http.get<ToeicWritingCommunityPage>(
          `/toeic/writing/tasks/${taskId}/community?limit=20${cursorQuery}`
        )
      ).data;
    },
    async share(submissionId: number) {
      return (
        await http.put<{ shared: true; sharedAt: string }>(
          `/toeic/writing/submissions/${submissionId}/share`
        )
      ).data;
    },
    async unshare(submissionId: number) {
      return (
        await http.delete<{ shared: false }>(
          `/toeic/writing/submissions/${submissionId}/share`
        )
      ).data;
    },
    async restoreCommunity(
      taskId: number,
      submissionId: number,
      version: string
    ) {
      return (
        await http.post<{ responseText: string }>(
          `/toeic/writing/tasks/${taskId}/community/${submissionId}/restore`,
          { contentVersion: version }
        )
      ).data;
    },
  };
}

export const toeicWritingApi = createToeicWritingApi(webHttpClient);
