import assert from "node:assert/strict";
import test from "node:test";
import type { ToeicGrammarTopicSummary } from "@repo/shared";

import {
  firstToeicGrammarSubtopicTarget,
  parseToeicGrammarCatalogTab,
  parseToeicGrammarPracticeRoute,
  resolveToeicGrammarDetailTab,
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

test("topic navigation selects its first ordered subtopic", () => {
  const topic = {
    subtopics: [{ target: "subtopic-1" }],
  } as Pick<ToeicGrammarTopicSummary, "subtopics">;

  assert.equal(firstToeicGrammarSubtopicTarget(topic), "subtopic-1");
  assert.equal(
    firstToeicGrammarSubtopicTarget({ ...topic, subtopics: [] }),
    null
  );
});

test("lessonless subtopics resolve to practice", () => {
  assert.equal(resolveToeicGrammarDetailTab("lesson", false), "practice");
  assert.equal(resolveToeicGrammarDetailTab("lesson", true), "lesson");
  assert.equal(resolveToeicGrammarDetailTab("practice", true), "practice");
});
