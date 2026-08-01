import assert from "node:assert/strict";
import test from "node:test";

import {
  createToeicReadingApi,
  toeicReadingKeys,
} from "../api/toeic-reading.api";

test("TOEIC Reading resource preserves all learner routes and query identities", async () => {
  const requests: Array<Record<string, unknown>> = [];
  const api = createToeicReadingApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: [] as T };
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
  const submission = {
    submissionKey: "00000000-0000-4000-8000-000000000001",
    testId: 11,
    sourceVersion: "a".repeat(64),
    answers: [{ questionId: 101, optionId: 1001 }],
  };
  const draft = {
    sourceVersion: "a".repeat(64),
    practicePart: 5 as const,
    activeQuestionId: 101,
    answers: [{ questionId: 101, optionId: 1001 }],
    reviewQuestionIds: [102],
  };

  await api.overview();
  await api.tests(5);
  await api.test(11, 6);
  await api.submit(submission);
  await api.attempts(7);
  await api.attempt(7);
  await api.draft(11, 5);
  await api.saveDraft(11, draft);
  await api.deleteDraft(11, 5);

  assert.deepEqual(requests, [
    { method: "GET", path: "/toeic/reading/overview" },
    { method: "GET", path: "/toeic/reading/tests?part=5" },
    { method: "GET", path: "/toeic/reading/tests/11?part=6" },
    { method: "POST", path: "/toeic/reading/attempts", body: submission },
    { method: "GET", path: "/toeic/reading/attempts?part=7" },
    { method: "GET", path: "/toeic/reading/attempts/7" },
    { method: "GET", path: "/toeic/reading/tests/11/draft?part=5" },
    {
      method: "PUT",
      path: "/toeic/reading/tests/11/draft",
      body: draft,
    },
    { method: "DELETE", path: "/toeic/reading/tests/11/draft?part=5" },
  ]);
  assert.deepEqual(toeicReadingKeys.overview(), ["toeic-reading", "overview"]);
  assert.deepEqual(toeicReadingKeys.tests(5), ["toeic-reading", "tests", 5]);
  assert.deepEqual(toeicReadingKeys.tests(), [
    "toeic-reading",
    "tests",
    "full",
  ]);
  assert.deepEqual(toeicReadingKeys.test(11, 6), [
    "toeic-reading",
    "test",
    11,
    6,
  ]);
  assert.deepEqual(toeicReadingKeys.attempts(7), [
    "toeic-reading",
    "attempts",
    7,
  ]);
  assert.deepEqual(toeicReadingKeys.attempt(7), [
    "toeic-reading",
    "attempt",
    7,
  ]);
  assert.deepEqual(toeicReadingKeys.draft(11, 5), [
    "toeic-reading",
    "draft",
    11,
    5,
  ]);
});
