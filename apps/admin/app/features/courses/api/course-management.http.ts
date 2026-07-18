import type { ApiEnvelope } from "@/app/features/auth/api/http-client";

export type CourseManagementHttp = {
  get<T>(
    path: string,
    options?: { params?: Record<string, unknown> }
  ): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  put<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

export const emptyCourseManagementPage = {
  data: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};

export function requireCourseManagementData<T>(response: ApiEnvelope<T>): T {
  if (response.data === undefined) {
    throw new Error("Course management response did not contain data");
  }

  return response.data;
}
