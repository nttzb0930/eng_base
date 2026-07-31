import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ConflictException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import {
  grammarAnswerFingerprint,
  SubmitToeicGrammarAnswerUseCase,
} from "../use-cases/submit-toeic-grammar-answer.use-case";

const version = "a".repeat(64);
const payload = {
  submissionKey: "00000000-0000-4000-8000-000000000001",
  snapshotVersion: version,
  mode: "topic" as const,
  target: "topic-1",
  questionId: 11,
  selectedOptionId: 112,
};

function sourceQuestion() {
  return {
    id: 11,
    source: "dautoeic",
    source_question_id: "source-q-1",
    question_number: 119,
    question_text: "The temperature is ------- 10 and 30 degrees.",
    explanation_vi: "Between đi với and.",
    explanation_en: null,
    question_translation: "Nhiệt độ nằm từ 10 đến 30 độ.",
    answer_translation: "between: ở giữa",
    vocabulary: ["temperature (n): nhiệt độ"],
    grammar_question_options: [
      { id: 111, label: "A", text: "above", correct: false },
      { id: 112, label: "B", text: "between", correct: true },
      { id: 113, label: "C", text: "in", correct: false },
      { id: 114, label: "D", text: "off", correct: false },
    ],
  };
}

test("grades and persists one answer transactionally", async () => {
  let attemptCreate: unknown;
  let progressUpsert: unknown;
  const transaction = {
    grammar_question_progress: {
      upsert: (args: unknown) => {
        progressUpsert = args;
        return Promise.resolve({ last_correct: true });
      },
      findMany: () =>
        Promise.resolve([
          { source_question_id: "source-q-1", last_correct: true },
        ]),
    },
    grammar_question_attempts: {
      create: (args: unknown) => {
        attemptCreate = args;
        return Promise.resolve({ id: 1 });
      },
    },
  };
  const prisma = {
    grammar_question_attempts: { findUnique: () => Promise.resolve(null) },
    grammar_content_snapshots: {
      findFirst: () =>
        Promise.resolve({
          id: 7,
          source: "dautoeic",
          snapshot_version: version,
        }),
    },
    grammar_questions: {
      findFirst: () => Promise.resolve(sourceQuestion()),
      findMany: () => Promise.resolve([{ source_question_id: "source-q-1" }]),
    },
    $transaction: (callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
  } as unknown as PrismaService;

  const result = await new SubmitToeicGrammarAnswerUseCase(prisma).execute(
    "user-1",
    payload
  );

  assert.equal(result.correct, true);
  assert.equal(result.correctOptionId, 112);
  assert.equal(result.questionTranslation, "Nhiệt độ nằm từ 10 đến 30 độ.");
  assert.deepEqual(result.vocabulary, ["temperature (n): nhiệt độ"]);
  assert.equal(result.collectionProgress.correctCount, 1);
  assert.deepEqual((progressUpsert as { where: unknown }).where, {
    user_id_source_source_question_id: {
      user_id: "user-1",
      source: "dautoeic",
      source_question_id: "source-q-1",
    },
  });
  const createData = (attemptCreate as { data: Record<string, unknown> }).data;
  assert.equal(
    createData.question_text_snapshot,
    sourceQuestion().question_text
  );
  assert.equal(createData.correct_option_text_snapshot, "between");
  assert.deepEqual(createData.collection_progress_snapshot, {
    questionCount: 1,
    correctCount: 1,
    incorrectCount: 0,
    unansweredCount: 0,
  });
});

test("reuses an identical submission and rejects conflicting key reuse", async () => {
  const existing = {
    submission_fingerprint: grammarAnswerFingerprint(payload),
    question_id_snapshot: 11,
    selected_option_id_snapshot: 112,
    correct_option_id_snapshot: 112,
    correct_option_label_snapshot: "B",
    correct_option_text_snapshot: "between",
    correct: true,
    explanation_vi_snapshot: "Between đi với and.",
    explanation_en_snapshot: null,
    question_translation_snapshot: null,
    answer_translation_snapshot: null,
    vocabulary_snapshot: [],
    collection_progress_snapshot: {
      questionCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      unansweredCount: 0,
    },
  };
  const samePrisma = {
    grammar_question_attempts: {
      findUnique: () => Promise.resolve(existing),
    },
  } as unknown as PrismaService;
  const sameUseCase = new SubmitToeicGrammarAnswerUseCase(samePrisma);
  const result = await sameUseCase.execute("user-1", payload);
  assert.equal(result.correct, true);

  const conflictUseCase = new SubmitToeicGrammarAnswerUseCase(samePrisma);
  await assert.rejects(
    () =>
      conflictUseCase.execute("user-1", {
        ...payload,
        selectedOptionId: 113,
      }),
    ConflictException
  );
});

test("rejects an option outside the collection question", async () => {
  const question = sourceQuestion();
  question.grammar_question_options = question.grammar_question_options.filter(
    (option) => option.id !== payload.selectedOptionId
  );
  const prisma = {
    grammar_question_attempts: { findUnique: () => Promise.resolve(null) },
    grammar_content_snapshots: {
      findFirst: () =>
        Promise.resolve({
          id: 7,
          source: "dautoeic",
          snapshot_version: version,
        }),
    },
    grammar_questions: { findFirst: () => Promise.resolve(question) },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      new SubmitToeicGrammarAnswerUseCase(prisma).execute("user-1", payload),
    BadRequestException
  );
});

test("returns the winning attempt after a concurrent idempotency conflict", async () => {
  let reads = 0;
  const existing = {
    submission_fingerprint: grammarAnswerFingerprint(payload),
    question_id_snapshot: 11,
    selected_option_id_snapshot: 112,
    correct_option_id_snapshot: 112,
    correct_option_label_snapshot: "B",
    correct_option_text_snapshot: "between",
    correct: true,
    explanation_vi_snapshot: null,
    explanation_en_snapshot: null,
    question_translation_snapshot: null,
    answer_translation_snapshot: null,
    vocabulary_snapshot: [],
    collection_progress_snapshot: {
      questionCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      unansweredCount: 0,
    },
  };
  const prisma = {
    grammar_question_attempts: {
      findUnique: () => Promise.resolve(reads++ === 0 ? null : existing),
    },
    grammar_content_snapshots: {
      findFirst: () =>
        Promise.resolve({
          id: 7,
          source: "dautoeic",
          snapshot_version: version,
        }),
    },
    grammar_questions: {
      findFirst: () => Promise.resolve(sourceQuestion()),
      findMany: () => Promise.resolve([{ source_question_id: "source-q-1" }]),
    },
    $transaction: () => Promise.reject({ code: "P2002" }),
  } as unknown as PrismaService;

  const result = await new SubmitToeicGrammarAnswerUseCase(prisma).execute(
    "user-1",
    payload
  );

  assert.equal(result.correct, true);
  assert.equal(reads, 2);
});
