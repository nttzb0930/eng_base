import type {
  ToeicReadingAttemptResult,
  ToeicReadingAttemptSummary,
  ToeicReadingDraft,
  ToeicReadingDraftPayload,
  ToeicReadingOverview,
  ToeicReadingPart,
  ToeicReadingPracticeAnswerPayload,
  ToeicReadingPracticeAnswerResult,
  ToeicReadingPracticeSession,
  ToeicReadingPracticeStartPayload,
  ToeicReadingPracticeSummary,
  ToeicReadingPracticeUpdatePayload,
  ToeicReadingSubmissionPayload,
  ToeicReadingTestDetail,
  ToeicReadingTestSummary,
} from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export type ToeicReadingHttp = {
  get<T>(path: string): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
  put<T>(path: string, body?: unknown): Promise<{ data: T }>;
  patch<T>(path: string, body?: unknown): Promise<{ data: T }>;
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
  practiceRoot: () => [...toeicReadingKeys.all, "practice"] as const,
  practice: (sessionId: number) =>
    [...toeicReadingKeys.practiceRoot(), sessionId] as const,
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
    async startPractice(body: ToeicReadingPracticeStartPayload) {
      return (
        await http.post<ToeicReadingPracticeSession>(
          "/toeic/reading/practice-sessions",
          body
        )
      ).data;
    },
    async practice(sessionId: number) {
      return (
        await http.get<ToeicReadingPracticeSession>(
          `/toeic/reading/practice-sessions/${sessionId}`
        )
      ).data;
    },
    async gradePracticeAnswer(
      sessionId: number,
      body: ToeicReadingPracticeAnswerPayload
    ) {
      return (
        await http.post<ToeicReadingPracticeAnswerResult>(
          `/toeic/reading/practice-sessions/${sessionId}/answers`,
          body
        )
      ).data;
    },
    async updatePractice(
      sessionId: number,
      body: ToeicReadingPracticeUpdatePayload
    ) {
      return (
        await http.patch<{
          activeQuestionId: number;
          reviewQuestionIds: number[];
          updatedAt: string;
        }>(`/toeic/reading/practice-sessions/${sessionId}`, body)
      ).data;
    },
    async completePractice(sessionId: number) {
      return (
        await http.post<ToeicReadingPracticeSummary>(
          `/toeic/reading/practice-sessions/${sessionId}/complete`
        )
      ).data;
    },
  };
}

export const toeicReadingApi = createToeicReadingApi(webHttpClient);

function withPart(path: string, part?: ToeicReadingPart) {
  return part === undefined ? path : `${path}?part=${part}`;
}
