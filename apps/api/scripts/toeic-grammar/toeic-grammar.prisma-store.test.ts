import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

import { normalizeGrammarSnapshot } from "./toeic-grammar.canonical.js";
import { createPrismaToeicGrammarImportStore } from "./toeic-grammar.prisma-store.js";

const sha = "a".repeat(64);
const snapshot = normalizeGrammarSnapshot({
  schemaVersion: 2,
  source: "dautoeic",
  snapshotVersion: sha,
  inventorySha256: sha,
  topics: [
    {
      sourceTopicId: "t-1",
      titleEn: null,
      titleVi: "Topic",
      descriptionVi: null,
      icon: null,
      orderIndex: 1,
    },
  ],
  subtopics: [
    {
      sourceSubtopicId: "s-1",
      sourceTopicId: "t-1",
      titleEn: null,
      titleVi: "Subtopic",
      descriptionVi: null,
      accessLevel: "free",
      orderIndex: 1,
    },
  ],
  lessons: [
    {
      sourceLessonId: "l-1",
      sourceSubtopicId: "s-1",
      titleEn: null,
      titleVi: "Lesson",
      contentType: "plain_text",
      theoryContentEn: null,
      theoryContentVi: "Body",
      lessonContentJson: null,
      htmlContent: null,
      orderIndex: 1,
    },
  ],
  questions: [],
  sets: [],
  difficultyLevels: [],
});

test("skips the already active grammar snapshot without a transaction", async () => {
  let transactionCalled = false;
  const prisma = {
    grammar_content_snapshots: { findFirst: async () => ({ id: 1 }) },
    $transaction: async () => {
      transactionCalled = true;
    },
  } as unknown as PrismaClient;
  assert.equal(
    await createPrismaToeicGrammarImportStore(prisma).replace(snapshot),
    "SKIPPED"
  );
  assert.equal(transactionCalled, false);
});

test("replaces source-owned content in one transaction and activates last", async () => {
  const events: string[] = [];
  const transaction = {
    grammar_content_snapshots: {
      deleteMany: async () => {
        events.push("delete");
      },
      create: async () => {
        events.push("snapshot");
        return { id: 7 };
      },
      update: async () => {
        events.push("activate");
      },
    },
    grammar_topics: {
      create: async () => {
        events.push("topic");
        return { id: 11 };
      },
    },
    grammar_subtopics: {
      create: async () => {
        events.push("subtopic");
        return { id: 12 };
      },
    },
    grammar_lessons: {
      create: async () => {
        events.push("lesson");
        return { id: 13 };
      },
    },
  };
  const prisma = {
    grammar_content_snapshots: { findFirst: async () => null },
    $transaction: async (run: (tx: typeof transaction) => Promise<void>) =>
      run(transaction),
  } as unknown as PrismaClient;
  assert.equal(
    await createPrismaToeicGrammarImportStore(prisma).replace(snapshot),
    "UPDATED"
  );
  assert.deepEqual(events, [
    "delete",
    "snapshot",
    "topic",
    "subtopic",
    "lesson",
    "activate",
  ]);
});
