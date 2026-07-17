import assert from "node:assert/strict";
import test from "node:test";

import { createUserApi } from "../api/user.api";

test("User resource preserves list and CRUD requests", async () => {
  const requests: unknown[] = [];
  const response = { data: [], pagination: { totalPages: 1, total: 0 } };
  const api = createUserApi({
    async get<T>(path: string, options?: { params?: Record<string, unknown> }) {
      requests.push({ method: "GET", path, params: options?.params });
      return { success: true, data: response as T };
    },
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return { success: true, data: { id: "1" } as T };
    },
    async put<T>(path: string, body?: unknown) {
      requests.push({ method: "PUT", path, body });
      return { success: true, data: { id: "1" } as T };
    },
    async delete<T>(path: string) {
      requests.push({ method: "DELETE", path });
      return { success: true } as { success: boolean; data?: T };
    },
  });

  await api.list({ page: 2, limit: 10, search: "lin" });
  await api.create({ username: "lin", email: "lin@example.com", password: "secret" });
  await api.update("1", { role: "ADMIN" });
  await api.remove("1");

  assert.deepEqual(requests, [
    { method: "GET", path: "/admin/users", params: { page: 2, limit: 10, search: "lin" } },
    { method: "POST", path: "/admin/users", body: { username: "lin", email: "lin@example.com", password: "secret" } },
    { method: "PUT", path: "/admin/users/1", body: { role: "ADMIN" } },
    { method: "DELETE", path: "/admin/users/1" },
  ]);
});

test("User list preserves its empty-page fallback", async () => {
  const api = createUserApi({
    async get<T>() {
      return { success: true } as { success: boolean; data?: T };
    },
    async post<T>() {
      return { success: true } as { success: boolean; data?: T };
    },
    async put<T>() {
      return { success: true } as { success: boolean; data?: T };
    },
    async delete<T>() {
      return { success: true } as { success: boolean; data?: T };
    },
  });

  assert.deepEqual(await api.list(), { data: [], pagination: { totalPages: 1 } });
});
