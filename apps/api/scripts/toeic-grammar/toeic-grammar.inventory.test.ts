import assert from "node:assert/strict";
import test from "node:test";

import { inventoryToeicGrammar } from "./toeic-grammar.inventory.js";
import type { ToeicGrammarSource } from "./toeic-grammar.types.js";

function question(id: string) {
  return {
    sourceQuestionId: id,
    sourceTopicId: "topic-1",
    sourceSubtopicId: "subtopic-1",
    questionNumber: 1,
    questionText: `Question ${id}`,
    options: [
      { label: "A" as const, text: "A", correct: true },
      { label: "B" as const, text: "B", correct: false },
      { label: "C" as const, text: "C", correct: false },
      { label: "D" as const, text: "D", correct: false },
    ],
    explanationVi: null,
    explanationEn: null,
    questionTranslation: null,
    answerTranslation: null,
    vocabulary: [],
    preferAiExplanation: false,
  };
}

function source(reverse = false): ToeicGrammarSource {
  const ordered = <T>(values: T[]) =>
    reverse ? [...values].reverse() : values;
  return {
    async readCatalog() {
      return {
        topics: ordered([
          {
            sourceTopicId: "topic-1",
            titleEn: "Prepositions",
            titleVi: "Giới từ",
            descriptionVi: null,
            icon: null,
            orderIndex: 1,
          },
        ]),
        subtopics: ordered([
          {
            sourceSubtopicId: "subtopic-1",
            sourceTopicId: "topic-1",
            titleEn: null,
            titleVi: "Between",
            descriptionVi: null,
            accessLevel: "free",
            orderIndex: 1,
          },
        ]),
      };
    },
    async readSets() {
      return ordered([
        {
          sourceSetId: "set-1",
          name: "Set 1",
          year: 2026,
          accessLevel: "free",
        },
      ]);
    },
    async readLessons() {
      return ordered([
        {
          sourceLessonId: "lesson-1",
          sourceSubtopicId: "subtopic-1",
          titleEn: null,
          titleVi: "Hậu tố từ loại",
          contentType: "plain_text",
          theoryContentEn: null,
          theoryContentVi: "Lesson body",
          lessonContentJson: null,
          htmlContent: null,
          orderIndex: 1,
        },
      ]);
    },
    async readTopicQuestions() {
      return ordered([question("q-2"), question("q-1")]);
    },
    async readSetQuestions() {
      return ordered([question("q-1")]);
    },
    async readDifficultyQuestions(level) {
      return level === 1 ? ordered([question("q-1")]) : [];
    },
  };
}

test("creates the same inventory checksum regardless of source order", async () => {
  const writes: unknown[] = [];
  const storage = {
    async writeInventory(value: unknown) {
      writes.push(value);
      return "inventory.json";
    },
  };
  const left = await inventoryToeicGrammar({ source: source(), storage });
  const right = await inventoryToeicGrammar({ source: source(true), storage });

  assert.equal(left.inventorySha256, right.inventorySha256);
  assert.equal(left.counts.topicQuestions, 2);
  assert.equal(left.counts.setQuestions, 1);
  assert.equal(left.counts.difficultyQuestions, 1);
  assert.equal(left.counts.lessons, 1);
  assert.deepEqual(left.lessonIdsBySubtopic, {
    "subtopic-1": ["lesson-1"],
  });
  assert.equal(writes.length, 2);
});

test("fails inventory when an authenticated difficulty request fails", async () => {
  const failing = source();
  failing.readDifficultyQuestions = async () => {
    throw new Error("Not authenticated");
  };
  await assert.rejects(
    inventoryToeicGrammar({
      source: failing,
      storage: {
        async writeInventory() {
          return "never";
        },
      },
    }),
    /Not authenticated/iu
  );
});
