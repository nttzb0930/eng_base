import assert from "node:assert/strict";
import test from "node:test";

import { createCourseApi } from "../api/course.api";

test("Course resource preserves list and detail routes", async () => {
  const requests: unknown[] = [];
  const api = createCourseApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: (path.endsWith("/7") ? { id: 7 } : []) as T };
    },
  });

  await api.list();
  await api.detail(7);

  assert.deepEqual(requests, [
    { method: "GET", path: "/courses" },
    { method: "GET", path: "/courses/7" },
  ]);
});
