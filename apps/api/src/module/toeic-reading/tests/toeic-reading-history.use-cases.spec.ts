import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetToeicReadingAttemptUseCase } from "../use-cases/get-toeic-reading-attempt.use-case";
import { ListToeicReadingAttemptsUseCase } from "../use-cases/list-toeic-reading-attempts.use-case";

const storedSummary = {
  id: 7,
  test_id: 11,
  practice_part: 5,
  test_title_snapshot: "Test 1",
  correct_count: 1,
  total_count: 1,
  accuracy: 100,
  submitted_at: new Date("2026-07-31T00:00:00.000Z"),
};
const storedResult = {
  ...storedSummary,
  source_version_snapshot: "a".repeat(64),
  toeic_reading_attempt_answers: [
    {
      question_id_snapshot: 101,
      question_number_snapshot: 101,
      part_snapshot: 5,
      question_prompt_snapshot: "Question snapshot",
      selected_option_label_snapshot: "A",
      selected_option_text_snapshot: "Selected snapshot",
      correct_option_label_snapshot: "A",
      correct_option_text_snapshot: "Correct snapshot",
      explanation_snapshot: "Explanation snapshot",
      correct: true,
    },
  ],
};

test("lists attempt summaries only for the authenticated learner", async () => {
  let query: unknown;
  const prisma = {
    toeic_reading_attempts: {
      findMany: (args: unknown) => {
        query = args;
        return Promise.resolve([storedSummary]);
      },
    },
  } as unknown as PrismaService;

  const result = await new ListToeicReadingAttemptsUseCase(prisma).execute(
    "learner-1"
  );
  assert.equal(result[0]?.testTitle, "Test 1");
  assert.equal(result[0]?.practicePart, 5);
  assert.deepEqual((query as { where: unknown }).where, {
    user_id: "learner-1",
  });
});

test("returns a result entirely from immutable snapshots", async () => {
  let query: unknown;
  const prisma = {
    toeic_reading_attempts: {
      findFirst: (args: unknown) => {
        query = args;
        return Promise.resolve(storedResult);
      },
    },
  } as unknown as PrismaService;

  const result = await new GetToeicReadingAttemptUseCase(prisma).execute(
    "learner-1",
    7
  );
  assert.equal(result.answers[0]?.question, "Question snapshot");
  assert.equal(result.practicePart, 5);
  assert.deepEqual(
    result.parts.map((part) => part.part),
    [5]
  );
  assert.equal(result.parts[0]?.accuracy, 100);
  assert.deepEqual((query as { where: unknown }).where, {
    id: 7,
    user_id: "learner-1",
  });
  assert.equal(
    JSON.stringify(query).includes("toeic_questions"),
    false,
    "completed results must not read mutable current questions"
  );
});

test("does not reveal another learner's attempt", async () => {
  const prisma = {
    toeic_reading_attempts: { findFirst: () => Promise.resolve(null) },
  } as unknown as PrismaService;
  await assert.rejects(
    () => new GetToeicReadingAttemptUseCase(prisma).execute("learner-1", 999),
    NotFoundException
  );
});
