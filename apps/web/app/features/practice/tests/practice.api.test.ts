import assert from "node:assert/strict";
import test from "node:test";

import { createPracticeApi } from "../api/practice.api";
import {
  normalizePracticeCefrLevel,
  normalizePracticeLessonNumber,
} from "../practice-level";

test("Practice resource preserves mode summary, challenges, and session routes", async () => {
  const requests: unknown[] = [];
  const api = createPracticeApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: [] as T };
    },
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return { data: undefined as T };
    },
  });

  await api.getFillBlankSummary();
  await api.listFillBlankChallenges({ level: "A1", lesson: 2 });
  await api.getListeningSummary();
  await api.listListeningChallenges({ level: "A2", lesson: 3 });
  await api.getDictationSummary();
  await api.listDictationChallenges({ level: "B1", lesson: 4 });
  await api.getWeakWordsSummary();
  await api.listWeakWordsChallenges();
  await api.listTopicChallenges("travel & food", "weak");
  await api.recordSession({ mode: "fill_blank", items: [] });

  assert.deepEqual(requests, [
    { method: "GET", path: "/practice/fill-blank/summary" },
    { method: "GET", path: "/practice/fill-blank/challenges?level=A1&lesson=2" },
    { method: "GET", path: "/practice/listening/summary" },
    { method: "GET", path: "/practice/listening/challenges?level=A2&lesson=3" },
    { method: "GET", path: "/practice/dictation/summary" },
    { method: "GET", path: "/practice/dictation/challenges?level=B1&lesson=4" },
    { method: "GET", path: "/practice/weak-words/summary" },
    { method: "GET", path: "/practice/weak-words/challenges" },
    {
      method: "GET",
      path: "/practice/topics/travel%20%26%20food/challenges?mode=weak",
    },
    {
      method: "POST",
      path: "/practice/sessions",
      body: { mode: "fill_blank", items: [] },
    },
  ]);
});

test("Practice level normalizers reject unsupported levels and invalid lessons", () => {
  assert.equal(normalizePracticeCefrLevel("A1"), "A1");
  assert.equal(normalizePracticeCefrLevel("C1"), undefined);
  assert.equal(normalizePracticeLessonNumber("2"), 2);
  assert.equal(normalizePracticeLessonNumber("0"), 1);
  assert.equal(normalizePracticeLessonNumber("abc"), 1);
});
