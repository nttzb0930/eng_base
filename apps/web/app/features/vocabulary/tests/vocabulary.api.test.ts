import assert from "node:assert/strict";
import test from "node:test";

import { createVocabularyApi } from "../api/vocabulary.api";

test("Vocabulary resource preserves saved and progress routes", async () => {
  const requests: unknown[] = [];
  const api = createVocabularyApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: [] as T };
    },
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return { data: { saved: true } as T };
    },
  });

  await api.listSaved();
  await api.toggleSaved(9);
  await api.recordReview(9, true);
  await api.recordFlashcard(9, "good");

  assert.deepEqual(requests, [
    { method: "GET", path: "/vocabulary/saved-words" },
    { method: "POST", path: "/vocabulary/9/toggle-saved", body: undefined },
    { method: "POST", path: "/vocabulary/9/review", body: { correct: true } },
    { method: "POST", path: "/vocabulary/9/flashcard", body: { rating: "good" } },
  ]);
});
