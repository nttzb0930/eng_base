import assert from "node:assert/strict";
import test from "node:test";

import {
  createReadingPassageApi,
  readingPassageKeys,
  type ReadingPassageHttp,
} from "../api/reading-passage.api";

test("Admin Reading resource preserves authoring and publication routes", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const http: ReadingPassageHttp = {
    get: async <T>(path: string) => {
      calls.push({ method: "GET", path });
      return { data: [] as T };
    },
    post: async <T>(path: string, body?: unknown) => {
      calls.push({ method: "POST", path, body });
      return { data: {} as T };
    },
    put: async <T>(path: string, body: unknown) => {
      calls.push({ method: "PUT", path, body });
      return { data: {} as T };
    },
  };
  const api = createReadingPassageApi(http);
  const createBody = {
    slug: "a-day-in-hanoi",
    title: "A Day in Hanoi",
    body: "Mia lives in Hanoi.",
    cefrLevel: "A1" as const,
    topicId: null,
    estimatedMinutes: 3,
    questions: [],
  };
  const updateBody = {
    title: createBody.title,
    body: createBody.body,
    cefrLevel: createBody.cefrLevel,
    topicId: null,
    estimatedMinutes: 3,
    questions: [],
  };

  await api.list();
  await api.topicOptions();
  await api.detail(3);
  await api.create(createBody);
  await api.update(3, updateBody);
  await api.publish(3);
  await api.unpublish(3);

  assert.deepEqual(calls, [
    { method: "GET", path: "/admin/reading-passages" },
    { method: "GET", path: "/admin/reading-passages/topic-options" },
    { method: "GET", path: "/admin/reading-passages/3" },
    { method: "POST", path: "/admin/reading-passages", body: createBody },
    { method: "PUT", path: "/admin/reading-passages/3", body: updateBody },
    {
      method: "POST",
      path: "/admin/reading-passages/3/publish",
      body: undefined,
    },
    {
      method: "POST",
      path: "/admin/reading-passages/3/unpublish",
      body: undefined,
    },
  ]);
  assert.deepEqual(readingPassageKeys.list(), ["reading-passages", "list"]);
  assert.deepEqual(readingPassageKeys.detail(3), [
    "reading-passages",
    "detail",
    3,
  ]);
});
