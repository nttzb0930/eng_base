import type { ApiEnvelope } from "@/src/lib/http-client";

export interface PracticeSessionItem {
  id: number;
  challengeType: string;
  correct: boolean;
  answer: string | null;
  vocabularyItem?: {
    word: string;
    primaryMeaningVi: string;
  };
}

export interface PracticeSession {
  id: number;
  userId: string;
  mode: string;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  createdAt: string;
  items?: PracticeSessionItem[];
}

export type ListPracticeSessionsQuery = {
  page?: number;
  limit?: number;
  user_id?: string;
};

export type PaginatedPracticeSessionsResponse = {
  data: PracticeSession[];
  pagination?: { totalPages: number; total?: number };
};

export type PracticeSessionsHttpClient = {
  get<T>(path: string, options?: { params?: Record<string, unknown> }): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

export function createPracticeSessionsService(http: PracticeSessionsHttpClient) {
  return {
    async getPracticeSessions(params?: ListPracticeSessionsQuery) {
      const res = await http.get<PaginatedPracticeSessionsResponse>("/admin/practiceSessions", {
        params: params as Record<string, unknown>,
      });
      return res.data ?? { data: [], pagination: { totalPages: 1 } };
    },

    async getPracticeSessionDetails(id: number) {
      const res = await http.get<PracticeSession>(`/admin/practiceSessions/${id}`);
      return res.data ?? null;
    },

    async deletePracticeSession(id: number) {
      await http.delete<unknown>(`/admin/practiceSessions/${id}`);
    },
  };
}
