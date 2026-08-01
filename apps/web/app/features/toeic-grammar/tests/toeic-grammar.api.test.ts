import assert from "node:assert/strict";
import test from "node:test";

import {
  createToeicGrammarApi,
  toeicGrammarKeys,
} from "../api/toeic-grammar.api";

test("Grammar resource uses exact authenticated paths and cache identities", async () => {
  const requests: Array<Record<string, unknown>> = [];
  const api = createToeicGrammarApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: {} as T };
    },
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return { data: {} as T };
    },
  });
  const answer = {
    submissionKey: "00000000-0000-4000-8000-000000000001",
    snapshotVersion: "a".repeat(64),
    mode: "subtopic" as const,
    target: "subtopic-1",
    questionId: 11,
    selectedOptionId: 112,
  };

  await api.catalog();
  await api.practice("subtopic", "subtopic-1");
  await api.answer(answer);

  assert.deepEqual(requests, [
    { method: "GET", path: "/toeic/grammar/catalog" },
    {
      method: "GET",
      path: "/toeic/grammar/practice?mode=subtopic&target=subtopic-1",
    },
    { method: "POST", path: "/toeic/grammar/answers", body: answer },
  ]);
  assert.deepEqual(toeicGrammarKeys.catalog(), ["toeic-grammar", "catalog"]);
  assert.deepEqual(toeicGrammarKeys.practice("level", "1"), [
    "toeic-grammar",
    "practice",
    "level",
    "1",
  ]);
});
