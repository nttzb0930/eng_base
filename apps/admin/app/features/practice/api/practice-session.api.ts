import type { ApiEnvelope } from "@/src/lib/http-client";
import { adminHttpClient } from "@/src/services/http/admin-http-client";

import type {
  ListPracticeSessionsQuery,
  PaginatedPracticeSessionsResponse,
  PracticeSession,
} from "../types/practice-session.types";

export type PracticeSessionHttp = {
  get<T>(path: string, options?: { params?: Record<string, unknown> }): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

export function createPracticeSessionApi(http: PracticeSessionHttp) {
  return {
    async list(params?: ListPracticeSessionsQuery) {
      const response = await http.get<PaginatedPracticeSessionsResponse>("/admin/practiceSessions", {
        params: params as Record<string, unknown>,
      });
      return response.data ?? { data: [], pagination: { totalPages: 1 } };
    },

    async detail(id: number) {
      const response = await http.get<PracticeSession>(`/admin/practiceSessions/${id}`);
      return response.data ?? null;
    },

    async remove(id: number) {
      await http.delete<unknown>(`/admin/practiceSessions/${id}`);
    },
  };
}

export const practiceSessionApi = createPracticeSessionApi(adminHttpClient as PracticeSessionHttp);
