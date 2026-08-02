import assert from "node:assert/strict";
import test from "node:test";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { SubmitToeicReadingAttemptUseCase } from "../use-cases/submit-toeic-reading-attempt.use-case";
import { createToeicReadingSubmissionFingerprint } from "../use-cases/toeic-reading-grading.policy";

const sourceVersion = "a".repeat(64);
const submission = {
  submissionKey: "00000000-0000-4000-8000-000000000001",
  testId: 11,
  sourceVersion,
  answers: [{ questionId: 101, optionId: 1001 }],
};
const storedTest = {
  id: 11,
  title: "Test 1",
  source_version: sourceVersion,
  toeic_questions: [
    {
      id: 101,
      number: 101,
      part: 5,
      prompt: "The device works ___ ten and thirty degrees.",
      explanation: "Use between with two endpoints.",
      toeic_question_options: [
        { id: 1001, label: "A", text: "between", correct: true },
        { id: 1002, label: "B", text: "inside", correct: false },
      ],
    },
  ],
};
const storedAttempt = {
  id: 7,
  test_id: 11,
  practice_part: null,
  submission_fingerprint: createToeicReadingSubmissionFingerprint(
    11,
    sourceVersion,
    submission.answers
  ),
  source_version_snapshot: sourceVersion,
  test_title_snapshot: "Test 1",
  correct_count: 1,
  total_count: 1,
  accuracy: 100,
  submitted_at: new Date("2026-07-31T00:00:00.000Z"),
  toeic_reading_attempt_answers: [
    {
      question_id_snapshot: 101,
      question_number_snapshot: 101,
      part_snapshot: 5,
      question_prompt_snapshot: storedTest.toeic_questions[0]!.prompt,
      selected_option_label_snapshot: "A",
      selected_option_text_snapshot: "between",
      correct_option_label_snapshot: "A",
      correct_option_text_snapshot: "between",
      explanation_snapshot: "Use between with two endpoints.",
      correct: true,
    },
  ],
};

test("grades and persists immutable TOEIC snapshots in one transaction", async () => {
  const creates: unknown[] = [];
  const draftDeletes: unknown[] = [];
  const transaction = {
    toeic_reading_attempts: {
      create: (args: unknown) => {
        creates.push(args);
        return Promise.resolve(storedAttempt);
      },
    },
    toeic_reading_drafts: {
      deleteMany: (args: unknown) => {
        draftDeletes.push(args);
        return Promise.resolve({ count: 1 });
      },
    },
  };
  const prisma = {
    toeic_reading_attempts: { findUnique: () => Promise.resolve(null) },
    toeic_tests: { findFirst: () => Promise.resolve(storedTest) },
    $transaction: (callback: (value: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  } as unknown as PrismaService;

  const result = await new SubmitToeicReadingAttemptUseCase(prisma).execute(
    "learner-1",
    submission
  );

  assert.equal(result.accuracy, 100);
  assert.deepEqual(result.parts[0], {
    part: 5,
    correctCount: 1,
    totalCount: 1,
    accuracy: 100,
  });
  const data = (
    creates[0] as {
      data: {
        source_version_snapshot: string;
        toeic_reading_attempt_answers: {
          create: Array<Record<string, unknown>>;
        };
      };
    }
  ).data;
  assert.equal(data.source_version_snapshot, sourceVersion);
  assert.deepEqual(data.toeic_reading_attempt_answers.create[0], {
    question_id_snapshot: 101,
    question_number_snapshot: 101,
    part_snapshot: 5,
    selected_option_id_snapshot: 1001,
    question_prompt_snapshot: "The device works ___ ten and thirty degrees.",
    selected_option_label_snapshot: "A",
    selected_option_text_snapshot: "between",
    correct_option_label_snapshot: "A",
    correct_option_text_snapshot: "between",
    explanation_snapshot: "Use between with two endpoints.",
    correct: true,
  });
  assert.deepEqual(draftDeletes, [
    {
      where: {
        user_id: "learner-1",
        test_id: 11,
        scope: "FULL",
      },
    },
  ]);
});

test("persists the selected Part for a Part-only attempt", async () => {
  const creates: Array<{ data: Record<string, unknown> }> = [];
  const scopedSubmission = {
    ...submission,
    practicePart: 5 as const,
  };
  const scopedAttempt = { ...storedAttempt, practice_part: 5 };
  const transaction = {
    toeic_reading_attempts: {
      create: (args: { data: Record<string, unknown> }) => {
        creates.push(args);
        return Promise.resolve(scopedAttempt);
      },
    },
    toeic_reading_drafts: {
      deleteMany: () => Promise.resolve({ count: 1 }),
    },
  };
  const prisma = {
    toeic_reading_attempts: { findUnique: () => Promise.resolve(null) },
    toeic_tests: { findFirst: () => Promise.resolve(storedTest) },
    $transaction: (callback: (value: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  } as unknown as PrismaService;

  const result = await new SubmitToeicReadingAttemptUseCase(prisma).execute(
    "learner-1",
    scopedSubmission
  );

  assert.equal(result.practicePart, 5);
  assert.equal(creates[0]?.data.practice_part, 5);
});

test("rejects an incomplete Full Test before creating an attempt", async () => {
  let transactions = 0;
  const prisma = {
    toeic_reading_attempts: { findUnique: () => Promise.resolve(null) },
    toeic_tests: {
      findFirst: () =>
        Promise.resolve({
          ...storedTest,
          toeic_questions: [
            ...storedTest.toeic_questions,
            {
              ...storedTest.toeic_questions[0],
              id: 102,
              number: 102,
              toeic_question_options: [
                { id: 2001, label: "A", text: "is", correct: true },
                { id: 2002, label: "B", text: "are", correct: false },
              ],
            },
          ],
        }),
    },
    $transaction: () => {
      transactions += 1;
      return Promise.reject(new Error("transaction must not run"));
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      new SubmitToeicReadingAttemptUseCase(prisma).execute(
        "learner-1",
        submission
      ),
    BadRequestException
  );
  assert.equal(transactions, 0);
});

test("returns the original attempt for an identical idempotent retry", async () => {
  let testReads = 0;
  const draftDeletes: unknown[] = [];
  const prisma = {
    toeic_reading_attempts: {
      findUnique: () => Promise.resolve(storedAttempt),
    },
    toeic_reading_drafts: {
      deleteMany: (args: unknown) => {
        draftDeletes.push(args);
        return Promise.resolve({ count: 1 });
      },
    },
    toeic_tests: {
      findFirst: () => {
        testReads += 1;
        return Promise.resolve(storedTest);
      },
    },
  } as unknown as PrismaService;

  const result = await new SubmitToeicReadingAttemptUseCase(prisma).execute(
    "learner-1",
    submission
  );
  assert.equal(result.id, 7);
  assert.equal(testReads, 0);
  assert.equal(draftDeletes.length, 1);
});

test("rejects key reuse with different answers", async () => {
  const prisma = {
    toeic_reading_attempts: {
      findUnique: () =>
        Promise.resolve({
          ...storedAttempt,
          submission_fingerprint: "different",
        }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      new SubmitToeicReadingAttemptUseCase(prisma).execute(
        "learner-1",
        submission
      ),
    ConflictException
  );
});

test("returns the winning attempt after a concurrent unique-key race", async () => {
  let reads = 0;
  let draftDeletes = 0;
  const prisma = {
    toeic_reading_attempts: {
      findUnique: () => {
        reads += 1;
        return Promise.resolve(reads === 1 ? null : storedAttempt);
      },
    },
    toeic_reading_drafts: {
      deleteMany: () => {
        draftDeletes += 1;
        return Promise.resolve({ count: 1 });
      },
    },
    toeic_tests: { findFirst: () => Promise.resolve(storedTest) },
    $transaction: () => Promise.reject({ code: "P2002" }),
  } as unknown as PrismaService;

  const result = await new SubmitToeicReadingAttemptUseCase(prisma).execute(
    "learner-1",
    submission
  );
  assert.equal(result.id, 7);
  assert.equal(reads, 2);
  assert.equal(draftDeletes, 1);
});

test("rejects unavailable and replaced tests", async () => {
  const unavailablePrisma = {
    toeic_reading_attempts: { findUnique: () => Promise.resolve(null) },
    toeic_tests: { findFirst: () => Promise.resolve(null) },
  } as unknown as PrismaService;
  await assert.rejects(
    () =>
      new SubmitToeicReadingAttemptUseCase(unavailablePrisma).execute(
        "learner-1",
        submission
      ),
    NotFoundException
  );

  const replacedPrisma = {
    toeic_reading_attempts: { findUnique: () => Promise.resolve(null) },
    toeic_tests: {
      findFirst: () =>
        Promise.resolve({ ...storedTest, source_version: "b".repeat(64) }),
    },
  } as unknown as PrismaService;
  await assert.rejects(
    () =>
      new SubmitToeicReadingAttemptUseCase(replacedPrisma).execute(
        "learner-1",
        submission
      ),
    ConflictException
  );
});
