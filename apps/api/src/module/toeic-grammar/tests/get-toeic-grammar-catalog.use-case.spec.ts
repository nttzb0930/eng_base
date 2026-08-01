import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetToeicGrammarCatalogUseCase } from "../use-cases/get-toeic-grammar-catalog.use-case";

test("catalog returns ordered collections with account progress", async () => {
  const prisma = {
    grammar_content_snapshots: {
      findFirst: () =>
        Promise.resolve({
          source: "dautoeic",
          snapshot_version: "a".repeat(64),
          grammar_topics: [
            {
              source_topic_id: "topic-1",
              title_en: "Prepositions",
              title_vi: "Giới từ",
              description_vi: null,
              icon: null,
              order_index: 1,
              grammar_questions: [
                { source_question_id: "q-1" },
                { source_question_id: "q-2" },
              ],
              grammar_subtopics: [
                {
                  source_subtopic_id: "subtopic-1",
                  title_en: "Place",
                  title_vi: "Nơi chốn",
                  description_vi: null,
                  access_level: "free",
                  order_index: 1,
                  grammar_questions: [{ source_question_id: "q-1" }],
                },
              ],
            },
          ],
          grammar_sets: [
            {
              source_set_id: "set-no-year",
              name: "Mixed",
              year: null,
              access_level: "free",
              grammar_set_questions: [],
            },
            {
              source_set_id: "set-2024",
              name: "2024",
              year: null,
              access_level: "free",
              grammar_set_questions: [],
            },
            {
              source_set_id: "set-1",
              name: "Set 1",
              year: 2026,
              access_level: "free",
              grammar_set_questions: [
                { grammar_questions: { source_question_id: "q-1" } },
              ],
            },
            {
              source_set_id: "set-2025",
              name: "2025",
              year: null,
              access_level: "free",
              grammar_set_questions: [],
            },
          ],
          grammar_question_difficulties: [
            { level: 1, grammar_questions: { source_question_id: "q-2" } },
          ],
        }),
    },
    grammar_question_progress: {
      findMany: () =>
        Promise.resolve([
          { source_question_id: "q-1", last_correct: true },
          { source_question_id: "q-2", last_correct: false },
        ]),
    },
  } as unknown as PrismaService;

  const result = await new GetToeicGrammarCatalogUseCase(prisma).execute(
    "user-1"
  );

  assert.equal(result.available, true);
  assert.equal(result.topics[0]?.questionCount, 2);
  assert.equal(result.topics[0]?.correctCount, 1);
  assert.equal(result.topics[0]?.incorrectCount, 1);
  assert.equal(result.topics[0]?.subtopics[0]?.correctCount, 1);
  assert.equal(
    result.sets.find((set) => set.target === "set-1")?.correctCount,
    1
  );
  assert.deepEqual(
    result.sets.map((set) => set.year),
    [2026, 2025, 2024, null]
  );
  assert.equal(result.levels[0]?.incorrectCount, 1);
});

test("catalog returns an empty unavailable result without an active snapshot", async () => {
  const prisma = {
    grammar_content_snapshots: { findFirst: () => Promise.resolve(null) },
  } as unknown as PrismaService;

  const result = await new GetToeicGrammarCatalogUseCase(prisma).execute(
    "user-1"
  );

  assert.deepEqual(result, {
    available: false,
    snapshotVersion: null,
    topics: [],
    sets: [],
    levels: [],
  });
});
