import assert from "node:assert/strict";
import test from "node:test";

import {
  parseToeicGrammarCatalogTab,
  parseToeicGrammarPracticeRoute,
} from "../toeic-grammar-route";

test("catalog tab parsing is URL-backed and fail-safe", () => {
  assert.equal(parseToeicGrammarCatalogTab("sets"), "sets");
  assert.equal(parseToeicGrammarCatalogTab("levels"), "levels");
  assert.equal(parseToeicGrammarCatalogTab("unknown"), "topics");
});

test("practice route accepts source targets and bounded levels", () => {
  assert.deepEqual(parseToeicGrammarPracticeRoute("topic", "topic-1"), {
    mode: "topic",
    target: "topic-1",
  });
  assert.deepEqual(parseToeicGrammarPracticeRoute("level", "5"), {
    mode: "level",
    target: "5",
  });
  assert.equal(parseToeicGrammarPracticeRoute("level", "6"), null);
  assert.equal(parseToeicGrammarPracticeRoute("unknown", "x"), null);
  assert.equal(parseToeicGrammarPracticeRoute("set", ""), null);
});
