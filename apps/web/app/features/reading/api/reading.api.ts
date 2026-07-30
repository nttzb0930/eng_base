import type {
  ReadingAttemptResult,
  ReadingAttemptSummary,
  ReadingCefrLevel,
  ReadingPassageDetail,
  ReadingPassageSummary,
  ReadingSubmissionPayload,
} from "@repo/shared";

import { webHttpClient } from "@/app/features/auth/api/web-http-client";

export type ReadingHttp = {
  get<T>(path: string): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
};

export const readingKeys = {
  all: ["reading"] as const,
  lists: () => [...readingKeys.all, "passages"] as const,
  list: (level: ReadingCefrLevel) => [...readingKeys.lists(), level] as const,
  detail: (slug: string) => [...readingKeys.all, "passage", slug] as const,
  histories: () => [...readingKeys.all, "attempts"] as const,
  history: (level: ReadingCefrLevel) =>
    [...readingKeys.histories(), level] as const,
  result: (attemptId: number) =>
    [...readingKeys.all, "attempt", attemptId] as const,
};

export function createReadingApi(http: ReadingHttp) {
  return {
    async list(level: ReadingCefrLevel) {
      return (
        await http.get<ReadingPassageSummary[]>(
          `/reading/passages?level=${encodeURIComponent(level)}`
        )
      ).data;
    },
    async detail(slug: string) {
      return (
        await http.get<ReadingPassageDetail>(
          `/reading/passages/${encodeURIComponent(slug)}`
        )
      ).data;
    },
    async submit(passageId: number, body: ReadingSubmissionPayload) {
      return (
        await http.post<ReadingAttemptResult>(
          `/reading/passages/${passageId}/attempts`,
          body
        )
      ).data;
    },
    async history(level: ReadingCefrLevel) {
      return (
        await http.get<ReadingAttemptSummary[]>(
          `/reading/attempts?level=${encodeURIComponent(level)}`
        )
      ).data;
    },
    async result(attemptId: number) {
      return (
        await http.get<ReadingAttemptResult>(`/reading/attempts/${attemptId}`)
      ).data;
    },
  };
}

export const readingApi = createReadingApi(webHttpClient);
