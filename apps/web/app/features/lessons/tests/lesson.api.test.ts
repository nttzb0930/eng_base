import assert from "node:assert/strict";
import test from "node:test";

import { createUnitApi } from "@/app/features/courses/api/unit.api";
import { createLessonApi } from "../api/lesson.api";

test("Unit and Lesson resources preserve read routes", async () => {
  const requests: unknown[] = [];
  const http = {
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: null as T };
    },
  };
  const unitApi = createUnitApi(http);
  const lessonApi = createLessonApi(http);

  await unitApi.list();
  await lessonApi.get();
  await lessonApi.get(7);

  assert.deepEqual(requests, [
    { method: "GET", path: "/units" },
    { method: "GET", path: "/lessons" },
    { method: "GET", path: "/lessons?id=7" },
  ]);
});
