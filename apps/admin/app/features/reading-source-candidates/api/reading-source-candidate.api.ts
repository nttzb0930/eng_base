import type {
  AdminReadingSourceCandidateDetail,
  AdminReadingSourceCandidateList,
  ConvertReadingSourceCandidatePayload,
  ConvertReadingSourceCandidateResult,
  RejectReadingSourceCandidatePayload,
  ReadingSourceCandidateStatus,
} from "@repo/shared";

import { adminHttpClient } from "@/app/features/auth/api/admin-http-client";

type Http = {
  get<T>(path: string): Promise<{ data?: T }>;
  post<T>(path: string, body: unknown): Promise<{ data?: T }>;
};

export type CandidateListQuery = {
  page: number;
  limit: number;
  status?: ReadingSourceCandidateStatus;
  sourceLevel?: "1" | "2";
  search?: string;
};

function data<T>(response: { data?: T }) {
  if (response.data === undefined) throw new Error("Candidate response has no data");
  return response.data;
}

export const readingSourceCandidateKeys = {
  all: ["reading-source-candidates"] as const,
  list: (query: CandidateListQuery) =>
    [...readingSourceCandidateKeys.all, "list", query] as const,
  detail: (id: number) =>
    [...readingSourceCandidateKeys.all, "detail", id] as const,
};

export function createReadingSourceCandidateApi(http: Http) {
  return {
    async list(query: CandidateListQuery) {
      const params = new URLSearchParams({
        page: String(query.page),
        limit: String(query.limit),
      });
      if (query.status) params.set("status", query.status);
      if (query.sourceLevel) params.set("sourceLevel", query.sourceLevel);
      if (query.search) params.set("search", query.search);
      return data(
        await http.get<AdminReadingSourceCandidateList>(
          `/admin/reading-source-candidates?${params.toString()}`,
        ),
      );
    },
    async detail(id: number) {
      return data(
        await http.get<AdminReadingSourceCandidateDetail>(
          `/admin/reading-source-candidates/${id}`,
        ),
      );
    },
    async convert(id: number, body: ConvertReadingSourceCandidatePayload) {
      return data(
        await http.post<ConvertReadingSourceCandidateResult>(
          `/admin/reading-source-candidates/${id}/convert`,
          body,
        ),
      );
    },
    async reject(id: number, body: RejectReadingSourceCandidatePayload) {
      return data(
        await http.post<AdminReadingSourceCandidateDetail>(
          `/admin/reading-source-candidates/${id}/reject`,
          body,
        ),
      );
    },
  };
}

export const readingSourceCandidateApi =
  createReadingSourceCandidateApi(adminHttpClient);
