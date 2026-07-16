import type { ApiEnvelope } from "@/src/lib/http-client";

export interface User {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "USER";
  createdAt: string;
}

export type ListUsersQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CreateUserBody = {
  username: string;
  email: string;
  password: string;
  role?: "ADMIN" | "USER";
};

export type UpdateUserBody = {
  username?: string;
  email?: string;
  password?: string;
  role?: "ADMIN" | "USER";
};

export type PaginatedUsersResponse = {
  data: User[];
  pagination?: { totalPages: number; total?: number };
};

export type UsersHttpClient = {
  get<T>(path: string, options?: { params?: Record<string, unknown> }): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  put<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

export function createUsersService(http: UsersHttpClient) {
  return {
    async getUsers(params?: ListUsersQuery) {
      const res = await http.get<PaginatedUsersResponse>("/admin/users", {
        params: params as Record<string, unknown>,
      });
      return res.data ?? { data: [], pagination: { totalPages: 1 } };
    },

    async createUser(body: CreateUserBody) {
      const res = await http.post<User>("/admin/users", body);
      return res.data;
    },

    async updateUser(id: string, body: UpdateUserBody) {
      const res = await http.put<User>(`/admin/users/${id}`, body);
      return res.data;
    },

    async deleteUser(id: string) {
      await http.delete<unknown>(`/admin/users/${id}`);
    },
  };
}
