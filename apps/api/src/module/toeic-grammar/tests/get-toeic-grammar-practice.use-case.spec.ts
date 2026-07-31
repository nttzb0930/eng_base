import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetToeicGrammarPracticeUseCase } from "../use-cases/get-toeic-grammar-practice.use-case";

function question(id: number, sourceQuestionId: string, number: number) {
  return {
    id,
    source_question_id: sourceQuestionId,
    question_number: number,
    question_text: `Question ${number}`,
    grammar_question_options: [
      { id: id * 10 + 1, label: "A", text: "A", correct: true },
      { id: id * 10 + 2, label: "B", text: "B", correct: false },
      { id: id * 10 + 3, label: "C", text: "C", correct: false },
      { id: id * 10 + 4, label: "D", text: "D", correct: false },
    ],
  };
}

test("practice returns safe ordered questions and starts at first unanswered", async () => {
  let questionQuery: unknown;
  const prisma = {
    grammar_content_snapshots: {
      findFirst: () =>
        Promise.resolve({
          id: 1,
          source: "dautoeic",
          snapshot_version: "a".repeat(64),
          grammar_topics: [
            {
              source_topic_id: "topic-1",
              title_en: "Prepositions",
              title_vi: "Giới từ",
            },
          ],
          grammar_subtopics: [],
          grammar_sets: [],
        }),
    },
    grammar_questions: {
      findMany: (query: unknown) => {
        questionQuery = query;
        return Promise.resolve([question(2, "q-2", 1), question(1, "q-1", 2)]);
      },
    },
    grammar_question_progress: {
      findMany: () =>
        Promise.resolve([
          {
            source_question_id: "q-2",
            last_selected_option_label: "B",
            last_correct: false,
          },
        ]),
    },
  } as unknown as PrismaService;

  const result = await new GetToeicGrammarPracticeUseCase(prisma).execute(
    "user-1",
    "topic",
    "topic-1"
  );

  assert.equal(result.questions[0]?.number, 1);
  assert.equal(result.initialQuestionIndex, 1);
  assert.equal(result.progress.incorrectCount, 1);
  assert.equal(result.progress.unansweredCount, 1);
  assert.equal(result.questions[0]?.progress.lastSelectedOptionId, 22);
  assert.equal(JSON.stringify(result).includes('"correct"'), false);
  assert.deepEqual(
    result.questions[0]?.options.map((option) => Object.keys(option).sort()),
    [
      ["id", "label", "text"],
      ["id", "label", "text"],
      ["id", "label", "text"],
      ["id", "label", "text"],
    ]
  );
  assert.deepEqual(
    (questionQuery as { where: unknown }).where,
    {
      snapshot_id: 1,
      grammar_topics: { source_topic_id: "topic-1" },
    }
  );
});

test("practice rejects a missing collection", async () => {
  const prisma = {
    grammar_content_snapshots: {
      findFirst: () =>
        Promise.resolve({
          id: 1,
          source: "dautoeic",
          snapshot_version: "a".repeat(64),
          grammar_topics: [],
          grammar_subtopics: [],
          grammar_sets: [],
        }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      new GetToeicGrammarPracticeUseCase(prisma).execute(
        "user-1",
        "topic",
        "missing"
      ),
    /not found/iu
  );
});
