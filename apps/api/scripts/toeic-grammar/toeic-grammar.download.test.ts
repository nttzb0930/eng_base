import assert from "node:assert/strict";
import test from "node:test";

import { downloadToeicGrammar } from "./toeic-grammar.download.js";
import type { ToeicGrammarInventory, ToeicGrammarSource } from "./toeic-grammar.types.js";

const sha = "a".repeat(64);
const topic = { sourceTopicId: "topic-1", titleEn: null, titleVi: "Giới từ", descriptionVi: null, icon: null, orderIndex: 1 };
const subtopic = { sourceSubtopicId: "subtopic-1", sourceTopicId: "topic-1", titleEn: null, titleVi: "Between", descriptionVi: null, accessLevel: "free", orderIndex: 1 };
const question = {
  sourceQuestionId: "q-1", sourceTopicId: "topic-1", sourceSubtopicId: "subtopic-1", questionNumber: 1,
  questionText: "Choose -------.", options: [
    { label: "A" as const, text: "between", correct: true }, { label: "B" as const, text: "above", correct: false },
    { label: "C" as const, text: "in", correct: false }, { label: "D" as const, text: "off", correct: false },
  ], explanationVi: null, explanationEn: null, questionTranslation: null, answerTranslation: null, vocabulary: [], preferAiExplanation: false,
};
const inventory: ToeicGrammarInventory = {
  schemaVersion: 1, source: "dautoeic", inventorySha256: sha, topics: [topic], subtopics: [subtopic],
  topicQuestionIds: { "topic-1": ["q-1"] },
  sets: [{ sourceSetId: "set-1", name: "Set 1", year: 2026, accessLevel: "free", questionIds: ["q-1"] }],
  difficultyLevels: [{ level: 1, questionIds: ["q-1"] }],
  counts: { topics: 1, subtopics: 1, sets: 1, topicQuestions: 1, setQuestions: 1, difficultyQuestions: 1 },
};

test("downloads one canonical question shared by topic, set, and level", async () => {
  const files = new Map<string, unknown>();
  const writes: string[] = [];
  const storage = {
    async readInventory() { return inventory; }, async readCheckpoint() { return null; },
    async writeCheckpoint(_version: string, value: unknown) { files.set("checkpoint.json", value); },
    async writeSnapshotFile(_version: string, name: string, value: unknown) { writes.push(name); files.set(name, value); },
  };
  const source: ToeicGrammarSource = {
    async readCatalog() { return { topics: [topic], subtopics: [subtopic] }; }, async readSets() { return []; },
    async readTopicQuestions() { return [question]; }, async readSetQuestions() { return [question]; },
    async readDifficultyQuestions(level) { return level === 1 ? [question] : []; },
  };
  const result = await downloadToeicGrammar({ approvedSha256: sha, source, storage, workers: 2 });
  const content = files.get("content.json") as { questions: unknown[]; sets: Array<{ questionIds: string[] }> };
  assert.equal(content.questions.length, 1);
  assert.deepEqual(content.sets[0]?.questionIds, ["q-1"]);
  assert.equal(result.questionCount, 1);
  assert.deepEqual(writes, ["content.json", "validation.json", "manifest.json"]);
});

test("rejects an inventory whose identity differs from the approved SHA", async () => {
  await assert.rejects(downloadToeicGrammar({
    approvedSha256: sha,
    source: {} as ToeicGrammarSource,
    storage: { async readInventory() { return { ...inventory, inventorySha256: "b".repeat(64) }; } },
    workers: 1,
  }), /identity/iu);
});
