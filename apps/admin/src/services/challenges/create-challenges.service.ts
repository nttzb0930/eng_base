import type { ApiEnvelope } from "@/src/lib/http-client";

export interface Lesson {
  id: number;
  title: string;
}

export interface Challenge {
  id: number;
  type: "SELECT" | "ASSIST";
  direction: "EN_TO_VI" | "VI_TO_EN" | null;
  question: string;
  order: number;
  lessonId: number;
  vocabularyItemId: number | null;
  lessons?: Lesson;
}

export type ListChallengesQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CreateChallengeBody = {
  question: string;
  type: "SELECT" | "ASSIST";
  direction: "EN_TO_VI" | "VI_TO_EN" | null;
  lessonId: number;
  order: number;
  vocabularyItemId: number | null;
};

export type UpdateChallengeBody = Partial<CreateChallengeBody>;

export type PaginatedChallengesResponse = {
  data: Challenge[];
  pagination?: { totalPages: number; total?: number };
};

export type ChallengesHttpClient = {
  get<T>(path: string, options?: { params?: Record<string, unknown> }): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  put<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

export function createChallengesService(http: ChallengesHttpClient) {
  return {
    async getChallenges(params?: ListChallengesQuery) {
      const res = await http.get<PaginatedChallengesResponse>("/admin/challenges", {
        params: params as Record<string, unknown>,
      });
      return res.data ?? { data: [], pagination: { totalPages: 1 } };
    },

    async getAllChallenges() {
      const res = await http.get<Challenge[]>("/admin/challenges");
      return res.data ?? [];
    },

    async createChallenge(body: CreateChallengeBody) {
      const res = await http.post<Challenge>("/admin/challenges", body);
      return res.data;
    },

    async updateChallenge(id: number, body: UpdateChallengeBody) {
      const res = await http.put<Challenge>(`/admin/challenges/${id}`, body);
      return res.data;
    },

    async deleteChallenge(id: number) {
      await http.delete<unknown>(`/admin/challenges/${id}`);
    },
  };
}
