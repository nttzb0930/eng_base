import type {
  ToeicReadingAttemptResult,
  ToeicReadingAttemptSummary,
  ToeicReadingDraft,
  ToeicReadingDraftPayload,
  ToeicReadingOverview,
  ToeicReadingPart,
  ToeicReadingSubmissionPayload,
  ToeicReadingTestDetail,
  ToeicReadingTestSummary,
} from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export type ToeicReadingHttp = {
  get<T>(path: string): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
  put<T>(path: string, body?: unknown): Promise<{ data: T }>;
  delete<T>(path: string): Promise<{ data: T }>;
};

export const toeicReadingKeys = {
  all: ["toeic-reading"] as const,
  overview: () => [...toeicReadingKeys.all, "overview"] as const,
  testsRoot: () => [...toeicReadingKeys.all, "tests"] as const,
  tests: (part?: ToeicReadingPart) =>
    [...toeicReadingKeys.testsRoot(), part ?? "full"] as const,
  test: (testId: number, part?: ToeicReadingPart) =>
    [...toeicReadingKeys.all, "test", testId, part ?? "full"] as const,
  draft: (testId: number, part?: ToeicReadingPart) =>
    [...toeicReadingKeys.all, "draft", testId, part ?? "full"] as const,
  attemptsRoot: () => [...toeicReadingKeys.all, "attempts"] as const,
  attempts: (part?: ToeicReadingPart) =>
    [...toeicReadingKeys.attemptsRoot(), part ?? "full"] as const,
  attempt: (attemptId: number) =>
    [...toeicReadingKeys.all, "attempt", attemptId] as const,
};

export function createToeicReadingApi(http: ToeicReadingHttp) {
  return {
    async overview() {
      return (await http.get<ToeicReadingOverview>("/toeic/reading/overview"))
        .data;
    },
    async tests(part?: ToeicReadingPart) {
      return (
        await http.get<ToeicReadingTestSummary[]>(
          withPart("/toeic/reading/tests", part)
        )
      ).data;
    },
    async test(testId: number, part?: ToeicReadingPart) {
      return (
        await http.get<ToeicReadingTestDetail>(
          withPart(`/toeic/reading/tests/${testId}`, part)
        )
      ).data;
    },
    async draft(testId: number, part?: ToeicReadingPart) {
      return (
        await http.get<ToeicReadingDraft | null>(
          withPart(`/toeic/reading/tests/${testId}/draft`, part)
        )
      ).data;
    },
    async saveDraft(testId: number, body: ToeicReadingDraftPayload) {
      return (
        await http.put<ToeicReadingDraft>(
          `/toeic/reading/tests/${testId}/draft`,
          body
        )
      ).data;
    },
    async deleteDraft(testId: number, part?: ToeicReadingPart) {
      return (
        await http.delete<{ deleted: boolean }>(
          withPart(`/toeic/reading/tests/${testId}/draft`, part)
        )
      ).data;
    },
    async submit(body: ToeicReadingSubmissionPayload) {
      return (
        await http.post<ToeicReadingAttemptResult>(
          "/toeic/reading/attempts",
          body
        )
      ).data;
    },
    async attempts(part?: ToeicReadingPart) {
      return (
        await http.get<ToeicReadingAttemptSummary[]>(
          withPart("/toeic/reading/attempts", part)
        )
      ).data;
    },
    async attempt(attemptId: number) {
      return (
        await http.get<ToeicReadingAttemptResult>(
          `/toeic/reading/attempts/${attemptId}`
        )
      ).data;
    },
  };
}

export const toeicReadingApi = createToeicReadingApi(webHttpClient);

function withPart(path: string, part?: ToeicReadingPart) {
  return part === undefined ? path : `${path}?part=${part}`;
}
