import assert from "node:assert/strict";
import test from "node:test";

import { createPracticeSessionApi } from "../api/practice-session.api";

test("Practice Session resource preserves list, detail, and delete routes", async () => {
  const requests: unknown[] = [];
  const api = createPracticeSessionApi({
    async get<T>(path: string, options?: { params?: Record<string, unknown> }) {
      requests.push({ method: "GET", path, params: options?.params });
      return {
        success: true,
        data: (path.endsWith("/7") ? { id: 7 } : { data: [], pagination: { totalPages: 1 } }) as T,
      };
    },
    async delete<T>(path: string) {
      requests.push({ method: "DELETE", path });
      return { success: true } as { success: boolean; data?: T };
    },
  });

  await api.list({ page: 1, limit: 10, user_id: "learner" });
  await api.detail(7);
  await api.remove(7);

  assert.deepEqual(requests, [
    { method: "GET", path: "/admin/practiceSessions", params: { page: 1, limit: 10, user_id: "learner" } },
    { method: "GET", path: "/admin/practiceSessions/7", params: undefined },
    { method: "DELETE", path: "/admin/practiceSessions/7" },
  ]);
});
