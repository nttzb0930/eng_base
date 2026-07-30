import assert from "node:assert/strict";
import test from "node:test";

import { createReadingApi, readingKeys } from "../api/reading.api";

test("learner Reading resource preserves discovery, session, submission, and result routes", async () => {
  const requests: Array<Record<string, unknown>> = [];
  const api = createReadingApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: [] as T };
    },
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return { data: {} as T };
    },
  });
  const submission = {
    submissionKey: "stable-submission-key",
    answers: [{ questionId: 2, optionId: 7 }],
  };

  await api.list("A1");
  await api.detail("daily life & work");
  await api.submit(12, submission);
  await api.history("A1");
  await api.result(24);

  assert.deepEqual(requests, [
    { method: "GET", path: "/reading/passages?level=A1" },
    {
      method: "GET",
      path: "/reading/passages/daily%20life%20%26%20work",
    },
    {
      method: "POST",
      path: "/reading/passages/12/attempts",
      body: submission,
    },
    { method: "GET", path: "/reading/attempts?level=A1" },
    { method: "GET", path: "/reading/attempts/24" },
  ]);

  assert.deepEqual(readingKeys.list("A1"), ["reading", "passages", "A1"]);
  assert.deepEqual(readingKeys.detail("daily-life"), [
    "reading",
    "passage",
    "daily-life",
  ]);
  assert.deepEqual(readingKeys.history("A1"), ["reading", "attempts", "A1"]);
  assert.deepEqual(readingKeys.result(24), ["reading", "attempt", 24]);
});
