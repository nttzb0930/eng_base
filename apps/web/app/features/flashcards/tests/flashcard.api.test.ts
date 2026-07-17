import assert from "node:assert/strict";
import test from "node:test";

import { createFlashcardApi } from "../api/flashcard.api";
import { normalizeFlashcardDeck } from "../flashcard-deck";

test("Flashcard resources preserve summary and session routes", async () => {
  const requests: unknown[] = [];
  const api = createFlashcardApi({
    async get<T>(path: string) {
      requests.push({ method: "GET", path });
      return { data: [] as T };
    },
  });

  await api.getSummary();
  await api.getSession("saved");

  assert.deepEqual(requests, [
    { method: "GET", path: "/flashcards/summary" },
    { method: "GET", path: "/flashcards/session?deck=saved" },
  ]);
});

test("normalizeFlashcardDeck keeps known decks and falls back to due", () => {
  for (const deck of ["due", "saved", "weak", "A1", "A2", "B1", "B2"] as const) {
    assert.equal(normalizeFlashcardDeck(deck), deck);
  }

  assert.equal(normalizeFlashcardDeck("C1"), "due");
  assert.equal(normalizeFlashcardDeck(undefined), "due");
});
