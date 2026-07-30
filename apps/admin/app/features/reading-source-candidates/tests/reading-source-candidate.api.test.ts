import assert from "node:assert/strict";
import test from "node:test";

import { createReadingSourceCandidateApi } from "../api/reading-source-candidate.api";

test("candidate API preserves exact admin resource paths", async () => {
  const calls: unknown[] = [];
  const http = {
    get: async <T>(path: string) => {
      calls.push({ method: "GET", path });
      return {
        data: (path.endsWith("/7")
          ? { id: 7 }
          : { items: [], total: 0 }) as T,
      };
    },
    post: async <T>(path: string, body: unknown) => {
      calls.push({ method: "POST", path, body });
      return { data: { id: 7 } as T };
    },
  };
  const api = createReadingSourceCandidateApi(http);
  const payload = { slug: "office" } as never;
  await api.list({ page: 1, limit: 20 });
  await api.detail(7);
  await api.convert(7, payload);
  await api.reject(7, { reason: "Duplicate" });
  assert.deepEqual(calls, [
    { method: "GET", path: "/admin/reading-source-candidates?page=1&limit=20" },
    { method: "GET", path: "/admin/reading-source-candidates/7" },
    {
      method: "POST",
      path: "/admin/reading-source-candidates/7/convert",
      body: payload,
    },
    {
      method: "POST",
      path: "/admin/reading-source-candidates/7/reject",
      body: { reason: "Duplicate" },
    },
  ]);
});
