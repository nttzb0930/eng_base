import type {
  AdminReadingPassage,
  CreateReadingPassagePayload,
  ReadingTopicOption,
  UpdateReadingPassagePayload,
} from "@repo/shared";

import { adminHttpClient } from "@/app/features/auth/api/admin-http-client";

export type ReadingPassageHttp = {
  get<T>(path: string): Promise<{ data?: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data?: T }>;
  put<T>(path: string, body: unknown): Promise<{ data?: T }>;
};

function requireData<T>(response: { data?: T }): T {
  if (response.data === undefined) {
    throw new Error("Reading passage response did not include data");
  }
  return response.data;
}

export const readingPassageKeys = {
  all: ["reading-passages"] as const,
  list: () => [...readingPassageKeys.all, "list"] as const,
  topics: () => [...readingPassageKeys.all, "topic-options"] as const,
  detail: (id: number) => [...readingPassageKeys.all, "detail", id] as const,
};

export function createReadingPassageApi(http: ReadingPassageHttp) {
  return {
    async list() {
      return (
        (await http.get<AdminReadingPassage[]>("/admin/reading-passages"))
          .data ?? []
      );
    },
    async topicOptions() {
      return (
        (
          await http.get<ReadingTopicOption[]>(
            "/admin/reading-passages/topic-options"
          )
        ).data ?? []
      );
    },
    async detail(id: number) {
      return requireData(
        await http.get<AdminReadingPassage>(`/admin/reading-passages/${id}`)
      );
    },
    async create(body: CreateReadingPassagePayload) {
      return requireData(
        await http.post<AdminReadingPassage>("/admin/reading-passages", body)
      );
    },
    async update(id: number, body: UpdateReadingPassagePayload) {
      return requireData(
        await http.put<AdminReadingPassage>(
          `/admin/reading-passages/${id}`,
          body
        )
      );
    },
    async publish(id: number) {
      return requireData(
        await http.post<AdminReadingPassage>(
          `/admin/reading-passages/${id}/publish`
        )
      );
    },
    async unpublish(id: number) {
      return requireData(
        await http.post<AdminReadingPassage>(
          `/admin/reading-passages/${id}/unpublish`
        )
      );
    },
  };
}

export const readingPassageApi = createReadingPassageApi(adminHttpClient);
