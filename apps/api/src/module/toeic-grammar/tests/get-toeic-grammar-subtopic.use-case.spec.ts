import assert from "node:assert/strict";
import test from "node:test";

import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetToeicGrammarSubtopicUseCase } from "../use-cases/get-toeic-grammar-subtopic.use-case";

test("returns ordered learner-safe lessons with account progress", async () => {
  const prisma = {
    grammar_content_snapshots: {
      findFirst: () =>
        Promise.resolve({
          snapshot_version: "a".repeat(64),
          source: "dautoeic",
          grammar_subtopics: [
            {
              source_subtopic_id: "subtopic-1",
              title_en: "Word forms",
              title_vi: "Hậu tố từ loại",
              description_vi: "Nhận biết từ loại.",
              grammar_topics: {
                source_topic_id: "topic-1",
                title_en: "Word forms",
                title_vi: "Từ loại",
              },
              grammar_lessons: [
                {
                  source_lesson_id: "lesson-1",
                  title_en: null,
                  title_vi: "Cách nhận biết",
                  content_type: "plain_text",
                  theory_content_en: null,
                  theory_content_vi: "Lesson body",
                  lesson_content_json: null,
                  order_index: 1,
                },
              ],
              grammar_questions: [
                { source_question_id: "q-1" },
                { source_question_id: "q-2" },
              ],
            },
          ],
        }),
    },
    grammar_question_progress: {
      findMany: () =>
        Promise.resolve([{ source_question_id: "q-1", last_correct: true }]),
    },
  } as unknown as PrismaService;

  const result = await new GetToeicGrammarSubtopicUseCase(prisma).execute(
    "user-1",
    "subtopic-1"
  );

  assert.equal(result.target, "subtopic-1");
  assert.equal(result.lessons[0]?.theoryContentVi, "Lesson body");
  assert.equal(result.progress.questionCount, 2);
  assert.equal(result.progress.correctCount, 1);
  assert.equal("htmlContent" in result.lessons[0]!, false);
  assert.equal("correctAnswer" in result, false);
});

test("rejects a subtopic outside the active snapshot", async () => {
  const prisma = {
    grammar_content_snapshots: {
      findFirst: () => Promise.resolve(null),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    new GetToeicGrammarSubtopicUseCase(prisma).execute("user-1", "missing"),
    NotFoundException
  );
});
