import type { ApiEnvelope } from "@/src/lib/http-client";

export interface Unit {
  id: number;
  title: string;
}

export interface Lesson {
  id: number;
  title: string;
  unitId: number;
  order: number;
  units?: Unit;
}

export type ListLessonsQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CreateLessonBody = {
  title: string;
  unitId: number;
  order: number;
};

export type UpdateLessonBody = {
  title?: string;
  unitId?: number;
  order?: number;
};

export type PaginatedLessonsResponse = {
  data: Lesson[];
  pagination?: { totalPages: number; total?: number };
};

export type LessonsHttpClient = {
  get<T>(path: string, options?: { params?: Record<string, unknown> }): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  put<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

export function createLessonsService(http: LessonsHttpClient) {
  return {
    async getLessons(params?: ListLessonsQuery) {
      const res = await http.get<PaginatedLessonsResponse>("/admin/lessons", {
        params: params as Record<string, unknown>,
      });
      return res.data ?? { data: [], pagination: { totalPages: 1 } };
    },

    async getAllLessons() {
      const res = await http.get<Lesson[]>("/admin/lessons");
      return res.data ?? [];
    },

    async createLesson(body: CreateLessonBody) {
      const res = await http.post<Lesson>("/admin/lessons", body);
      return res.data;
    },

    async updateLesson(id: number, body: UpdateLessonBody) {
      const res = await http.put<Lesson>(`/admin/lessons/${id}`, body);
      return res.data;
    },

    async deleteLesson(id: number) {
      await http.delete<unknown>(`/admin/lessons/${id}`);
    },
  };
}
