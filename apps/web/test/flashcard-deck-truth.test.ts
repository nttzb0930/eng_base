import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const readWebSource = (relativePath: string) =>
  readFileSync(join(import.meta.dirname, "..", relativePath), "utf8");

test("Flashcard overview renders only server-owned deck metrics", () => {
  const view = readWebSource("app/views/flashcards/FlashcardsView.tsx");

  assert.doesNotMatch(view, /CERT_DECKS|TOPIC_DECKS|percent:\s*\d+/);
  assert.doesNotMatch(view, /savedCount\s*-\s*weakCount|summary\.levels/);
  assert.match(view, /summary\.overview/);
  assert.match(view, /summary\.cefrDecks/);
  assert.match(view, /summary\.topicDecks/);
  assert.match(view, /useTopics/);
});

test("Flashcard Topic sessions come from the API without client item mapping", () => {
  const apiSource = readWebSource(
    "app/features/flashcards/api/flashcard.api.ts",
  );
  const sessionView = readWebSource(
    "app/views/flashcards/FlashcardSessionView.tsx",
  );

  assert.match(apiSource, /query\.set\("source", request\.source\)/);
  assert.doesNotMatch(sessionView, /\buseTopic\(|topicItems|new Date\(\)/);
  assert.match(sessionView, /useFlashcardSession/);
});
