import type { ApiEnvelope } from "@/src/lib/http-client";
import { adminHttpClient } from "@/src/services/http/admin-http-client";

import type {
  CreateUserBody,
  ListUsersQuery,
  PaginatedUsersResponse,
  UpdateUserBody,
  User,
} from "../types/user-management.types";

export type UserHttp = {
  get<T>(path: string, options?: { params?: Record<string, unknown> }): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  put<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

export function createUserApi(http: UserHttp) {
  return {
    async list(params?: ListUsersQuery) {
      const response = await http.get<PaginatedUsersResponse>("/admin/users", {
        params: params as Record<string, unknown>,
      });
      return response.data ?? { data: [], pagination: { totalPages: 1 } };
    },

    async create(body: CreateUserBody) {
      const response = await http.post<User>("/admin/users", body);
      return response.data;
    },

    async update(id: string, body: UpdateUserBody) {
      const response = await http.put<User>(`/admin/users/${id}`, body);
      return response.data;
    },

    async remove(id: string) {
      await http.delete<unknown>(`/admin/users/${id}`);
    },
  };
}

export const userApi = createUserApi(adminHttpClient as UserHttp);
