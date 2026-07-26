import assert from "node:assert/strict";
import test from "node:test";

import { createFlashcardApi } from "../api/flashcard.api";

test("Flashcard resources preserve summary and session routes", async () => {
  const requests: unknown[] = [];
  const api = createFlashcardApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: [] as T };
    },
  });

  await api.getSummary();
  await api.getSession({ deck: "saved" });
  await api.getSession({ source: "topic", slug: "travel & transport" });

  assert.deepEqual(requests, [
    { method: "GET", path: "/flashcards/summary" },
    { method: "GET", path: "/flashcards/session?deck=saved" },
    {
      method: "GET",
      path: "/flashcards/session?source=topic&slug=travel+%26+transport",
    },
  ]);
});
