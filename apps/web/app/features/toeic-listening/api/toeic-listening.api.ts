import type {
  ToeicListeningAttemptResult,
  ToeicListeningAnswerCheckPayload,
  ToeicListeningAnswerCheckResult,
  ToeicListeningAttemptSummary,
  ToeicListeningDraft,
  ToeicListeningDraftPayload,
  ToeicListeningOverview,
  ToeicListeningPart,
  ToeicListeningSubmissionPayload,
  ToeicListeningTestDetail,
  ToeicListeningTestSummary,
} from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export type ToeicListeningHttp = {
  get<T>(
    path: string,
    config?: { responseType?: "blob" }
  ): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
  put<T>(path: string, body?: unknown): Promise<{ data: T }>;
  delete<T>(path: string): Promise<{ data: T }>;
};

export const toeicListeningKeys = {
  all: ["toeic-listening"] as const,
  overview: () => [...toeicListeningKeys.all, "overview"] as const,
  testsRoot: () => [...toeicListeningKeys.all, "tests"] as const,
  tests: (part?: ToeicListeningPart) =>
    [...toeicListeningKeys.testsRoot(), part ?? "full"] as const,
  test: (testId: number, part?: ToeicListeningPart) =>
    [...toeicListeningKeys.all, "test", testId, part ?? "full"] as const,
  draft: (testId: number, part?: ToeicListeningPart) =>
    [...toeicListeningKeys.all, "draft", testId, part ?? "full"] as const,
  attemptsRoot: () => [...toeicListeningKeys.all, "attempts"] as const,
  attempts: (part?: ToeicListeningPart) =>
    [...toeicListeningKeys.attemptsRoot(), part ?? "full"] as const,
  attempt: (attemptId: number) =>
    [...toeicListeningKeys.all, "attempt", attemptId] as const,
};

export function createToeicListeningApi(http: ToeicListeningHttp) {
  return {
    async overview() {
      return (
        await http.get<ToeicListeningOverview>("/toeic/listening/overview")
      ).data;
    },
    async tests(part?: ToeicListeningPart) {
      return (
        await http.get<ToeicListeningTestSummary[]>(
          withPart("/toeic/listening/tests", part)
        )
      ).data;
    },
    async test(testId: number, part?: ToeicListeningPart) {
      return (
        await http.get<ToeicListeningTestDetail>(
          withPart(`/toeic/listening/tests/${testId}`, part)
        )
      ).data;
    },
    async checkAnswer(testId: number, body: ToeicListeningAnswerCheckPayload) {
      return (
        await http.post<ToeicListeningAnswerCheckResult>(
          `/toeic/listening/tests/${testId}/check-answer`,
          body
        )
      ).data;
    },
    async draft(testId: number, part?: ToeicListeningPart) {
      return (
        await http.get<ToeicListeningDraft | null>(
          withPart(`/toeic/listening/tests/${testId}/draft`, part)
        )
      ).data;
    },
    async saveDraft(testId: number, body: ToeicListeningDraftPayload) {
      return (
        await http.put<ToeicListeningDraft>(
          `/toeic/listening/tests/${testId}/draft`,
          body
        )
      ).data;
    },
    async deleteDraft(testId: number, part?: ToeicListeningPart) {
      return (
        await http.delete<{ deleted: boolean }>(
          withPart(`/toeic/listening/tests/${testId}/draft`, part)
        )
      ).data;
    },
    async submit(body: ToeicListeningSubmissionPayload) {
      return (
        await http.post<ToeicListeningAttemptResult>(
          "/toeic/listening/attempts",
          body
        )
      ).data;
    },
    async attempts(part?: ToeicListeningPart) {
      return (
        await http.get<ToeicListeningAttemptSummary[]>(
          withPart("/toeic/listening/attempts", part)
        )
      ).data;
    },
    async attempt(attemptId: number) {
      return (
        await http.get<ToeicListeningAttemptResult>(
          `/toeic/listening/attempts/${attemptId}`
        )
      ).data;
    },
    async media(assetId: number) {
      return (
        await http.get<Blob>(`/toeic/listening/media/${assetId}`, {
          responseType: "blob",
        })
      ).data;
    },
  };
}

export const toeicListeningApi = createToeicListeningApi(webHttpClient);

function withPart(path: string, part?: ToeicListeningPart) {
  return part === undefined ? path : `${path}?part=${part}`;
}
