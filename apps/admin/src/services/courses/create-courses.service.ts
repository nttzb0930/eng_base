import type { ApiEnvelope } from "@/src/lib/http-client";

export interface Course {
  id: number;
  title: string;
  imageSrc: string;
}

export type ListCoursesQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CreateCourseBody = {
  title: string;
  imageSrc: string;
};

export type UpdateCourseBody = {
  title?: string;
  imageSrc?: string;
};

export type PaginatedCoursesResponse = {
  data: Course[];
  pagination?: { totalPages: number; total?: number };
};

export type CoursesHttpClient = {
  get<T>(path: string, options?: { params?: Record<string, unknown> }): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  put<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

export function createCoursesService(http: CoursesHttpClient) {
  return {
    async getCourses(params?: ListCoursesQuery) {
      const res = await http.get<PaginatedCoursesResponse>("/admin/courses", {
        params: params as Record<string, unknown>,
      });
      return res.data ?? { data: [], pagination: { totalPages: 1 } };
    },

    async getAllCourses() {
      const res = await http.get<Course[]>("/admin/courses");
      return res.data ?? [];
    },

    async createCourse(body: CreateCourseBody) {
      const res = await http.post<Course>("/admin/courses", body);
      return res.data;
    },

    async updateCourse(id: number, body: UpdateCourseBody) {
      const res = await http.put<Course>(`/admin/courses/${id}`, body);
      return res.data;
    },

    async deleteCourse(id: number) {
      await http.delete<unknown>(`/admin/courses/${id}`);
    },
  };
}
