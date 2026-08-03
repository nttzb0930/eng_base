import assert from "node:assert/strict";
import test from "node:test";

import {
  createToeicWritingApi,
  toeicWritingKeys,
} from "../api/toeic-writing.api";

test("Writing resource preserves catalog, task, draft, and submission routes", async () => {
  const requests: Array<Record<string, unknown>> = [];
  const api = createToeicWritingApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: {} as T };
    },
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return { data: {} as T };
    },
    async put<T>(path: string, body?: unknown) {
      requests.push({ method: "PUT", path, body });
      return { data: {} as T };
    },
    async delete<T>(path: string) {
      requests.push({ method: "DELETE", path });
      return { data: {} as T };
    },
  });
  const draft = {
    contentVersion: "a".repeat(64),
    responseText: "The worker is checking a report.",
  };
  const submission = {
    ...draft,
    submissionKey: "00000000-0000-4000-8000-000000000001",
  };

  await api.overview();
  await api.tasks(1);
  await api.task(11);
  await api.draft(11);
  await api.saveDraft(11, draft);
  await api.deleteDraft(11);
  await api.submit(11, submission);
  await api.submission(31);

  assert.deepEqual(requests, [
    { method: "GET", path: "/toeic/writing/overview" },
    { method: "GET", path: "/toeic/writing/tasks?part=1" },
    { method: "GET", path: "/toeic/writing/tasks/11" },
    { method: "GET", path: "/toeic/writing/tasks/11/draft" },
    {
      method: "PUT",
      path: "/toeic/writing/tasks/11/draft",
      body: draft,
    },
    { method: "DELETE", path: "/toeic/writing/tasks/11/draft" },
    {
      method: "POST",
      path: "/toeic/writing/tasks/11/submissions",
      body: submission,
    },
    { method: "GET", path: "/toeic/writing/submissions/31" },
  ]);
  assert.deepEqual(toeicWritingKeys.overview(), ["toeic-writing", "overview"]);
  assert.deepEqual(toeicWritingKeys.tasks(1), ["toeic-writing", "tasks", 1]);
  assert.deepEqual(toeicWritingKeys.task(11), ["toeic-writing", "task", 11]);
  assert.deepEqual(toeicWritingKeys.draft(11), ["toeic-writing", "draft", 11]);
  assert.deepEqual(toeicWritingKeys.submission(31), [
    "toeic-writing",
    "submission",
    31,
  ]);
});
