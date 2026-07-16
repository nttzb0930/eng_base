import type { ApiEnvelope } from "@/src/lib/http-client";

export interface Challenge {
  id: number;
  question: string;
}

export interface ChallengeOption {
  id: number;
  challengeId: number;
  text: string;
  correct: boolean;
  imageSrc: string | null;
  audioSrc: string | null;
  challenges?: Challenge;
}

export type ListChallengeOptionsQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CreateChallengeOptionBody = {
  challengeId: number;
  text: string;
  correct: boolean;
  imageSrc: string | null;
  audioSrc: string | null;
};

export type UpdateChallengeOptionBody = Partial<CreateChallengeOptionBody>;

export type PaginatedChallengeOptionsResponse = {
  data: ChallengeOption[];
  pagination?: { totalPages: number; total?: number };
};

export type ChallengeOptionsHttpClient = {
  get<T>(path: string, options?: { params?: Record<string, unknown> }): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  put<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

export function createChallengeOptionsService(http: ChallengeOptionsHttpClient) {
  return {
    async getChallengeOptions(params?: ListChallengeOptionsQuery) {
      const res = await http.get<PaginatedChallengeOptionsResponse>("/admin/challengeOptions", {
        params: params as Record<string, unknown>,
      });
      return res.data ?? { data: [], pagination: { totalPages: 1 } };
    },

    async createChallengeOption(body: CreateChallengeOptionBody) {
      const res = await http.post<ChallengeOption>("/admin/challengeOptions", body);
      return res.data;
    },

    async updateChallengeOption(id: number, body: UpdateChallengeOptionBody) {
      const res = await http.put<ChallengeOption>(`/admin/challengeOptions/${id}`, body);
      return res.data;
    },

    async deleteChallengeOption(id: number) {
      await http.delete<unknown>(`/admin/challengeOptions/${id}`);
    },
  };
}
