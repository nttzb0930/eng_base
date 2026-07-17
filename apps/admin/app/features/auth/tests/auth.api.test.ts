import assert from "node:assert/strict";
import test from "node:test";

import { createAuthApi } from "../api/auth.api";

test("Admin login preserves its endpoint and returns the response data", async () => {
  const requests: unknown[] = [];
  const api = createAuthApi({
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return {
        success: true,
        data: {
          token: "token",
          user: { id: "1", username: "admin", email: "a@b.c", role: "ADMIN" },
        } as T,
      };
    },
  });

  assert.equal((await api.login({ username: "admin", password: "secret" })).token, "token");
  assert.deepEqual(requests, [
    { method: "POST", path: "/admin/auth/login", body: { username: "admin", password: "secret" } },
  ]);
});

test("Admin login rejects an empty response envelope", async () => {
  const api = createAuthApi({
    async post<T>() {
      return { success: true } as { success: boolean; data?: T };
    },
  });

  await assert.rejects(() => api.login({ username: "admin", password: "secret" }), /Invalid login response/);
});
