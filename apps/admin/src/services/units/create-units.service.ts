import type { ApiEnvelope } from "@/src/lib/http-client";

export interface Course {
  id: number;
  title: string;
}

export interface Unit {
  id: number;
  title: string;
  description: string;
  courseId: number;
  order: number;
  courses?: Course;
}

export type ListUnitsQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CreateUnitBody = {
  title: string;
  description: string;
  courseId: number;
  order: number;
};

export type UpdateUnitBody = {
  title?: string;
  description?: string;
  courseId?: number;
  order?: number;
};

export type PaginatedUnitsResponse = {
  data: Unit[];
  pagination?: { totalPages: number; total?: number };
};

export type UnitsHttpClient = {
  get<T>(path: string, options?: { params?: Record<string, unknown> }): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  put<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

export function createUnitsService(http: UnitsHttpClient) {
  return {
    async getUnits(params?: ListUnitsQuery) {
      const res = await http.get<PaginatedUnitsResponse>("/admin/units", {
        params: params as Record<string, unknown>,
      });
      return res.data ?? { data: [], pagination: { totalPages: 1 } };
    },

    async getAllUnits() {
      const res = await http.get<Unit[]>("/admin/units");
      return res.data ?? [];
    },

    async createUnit(body: CreateUnitBody) {
      const res = await http.post<Unit>("/admin/units", body);
      return res.data;
    },

    async updateUnit(id: number, body: UpdateUnitBody) {
      const res = await http.put<Unit>(`/admin/units/${id}`, body);
      return res.data;
    },

    async deleteUnit(id: number) {
      await http.delete<unknown>(`/admin/units/${id}`);
    },
  };
}
