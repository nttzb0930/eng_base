import assert from "node:assert/strict";
import test from "node:test";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

import { CompleteToeicReadingPracticeUseCase } from "../use-cases/complete-toeic-reading-practice.use-case";
import { GetToeicReadingPracticeUseCase } from "../use-cases/get-toeic-reading-practice.use-case";
import { GradeToeicReadingPracticeAnswerUseCase } from "../use-cases/grade-toeic-reading-practice-answer.use-case";
import { StartToeicReadingPracticeUseCase } from "../use-cases/start-toeic-reading-practice.use-case";
import { UpdateToeicReadingPracticeUseCase } from "../use-cases/update-toeic-reading-practice.use-case";

const testContent = {
  id: 11,
  title: "Test 1",
  source_version: "a".repeat(64),
  status: "PUBLISHED",
  toeic_test_sets: { title: "2026" },
  toeic_stimuli: [],
  toeic_questions: [
    {
      id: 101,
      number: 101,
      part: 5,
      stimulus_id: null,
      prompt: "The train arrived -- time.",
      translation: "Tàu đến đúng giờ.",
      explanation: "Use the preposition on.",
      toeic_question_options: [
        { id: 1001, label: "A", text: "in", correct: false },
        { id: 1002, label: "B", text: "on", correct: true },
      ],
    },
    {
      id: 102,
      number: 102,
      part: 5,
      stimulus_id: null,
      prompt: "A second question.",
      translation: null,
      explanation: null,
      toeic_question_options: [
        { id: 1003, label: "A", text: "first", correct: true },
        { id: 1004, label: "B", text: "second", correct: false },
      ],
    },
  ],
};

const storedSession = {
  id: 31,
  user_id: "learner-1",
  test_id: 11,
  part: 5,
  source_version: "a".repeat(64),
  status: "ACTIVE",
  active_key: "active-key",
  active_question_id: 101,
  review_question_ids: [],
  correct_count: 0,
  incorrect_count: 0,
  created_at: new Date("2026-08-02T00:00:00.000Z"),
  updated_at: new Date("2026-08-02T00:00:00.000Z"),
  completed_at: null,
  toeic_tests: testContent,
  toeic_reading_practice_answers: [],
};

const storedAnswer = {
  question_id_snapshot: 101,
  selected_option_id_snapshot: 1002,
  correct_option_id_snapshot: 1002,
  correct_option_label_snapshot: "B",
  correct_option_text_snapshot: "on",
  explanation_snapshot: "Use the preposition on.",
  question_translation_snapshot: "Tàu đến đúng giờ.",
  correct: true,
};

test("start resumes the active session for the same learner and scope", async () => {
  const getCalls: unknown[] = [];
  const prisma = {
    toeic_tests: { findFirst: async () => testContent },
    toeic_reading_practice_sessions: {
      findUnique: async () => ({ id: 31 }),
      create: async () => assert.fail("must not create a duplicate session"),
    },
  };
  const getPractice = {
    execute: async (...args: unknown[]) => {
      getCalls.push(args);
      return { id: 31 };
    },
  };

  const result = await new StartToeicReadingPracticeUseCase(
    prisma as never,
    getPractice as never
  ).execute("learner-1", {
    testId: 11,
    part: 5,
    sourceVersion: "a".repeat(64),
  });

  assert.equal(result.id, 31);
  assert.deepEqual(getCalls, [["learner-1", 31]]);
});

test("start rejects a replaced source version", async () => {
  const prisma = { toeic_tests: { findFirst: async () => testContent } };
  await assert.rejects(
    () =>
      new StartToeicReadingPracticeUseCase(
        prisma as never,
        {} as never
      ).execute("learner-1", {
        testId: 11,
        part: 5,
        sourceVersion: "b".repeat(64),
      }),
    ConflictException
  );
});

test("get exposes feedback only for already graded questions", async () => {
  const prisma = {
    toeic_reading_practice_sessions: {
      findFirst: async () => ({
        ...storedSession,
        correct_count: 1,
        toeic_reading_practice_answers: [
          {
            id: 1,
            session_id: 31,
            request_key: "00000000-0000-4000-8000-000000000001",
            question_id_snapshot: 101,
            question_number_snapshot: 101,
            selected_option_id_snapshot: 1002,
            selected_option_label_snapshot: "B",
            selected_option_text_snapshot: "on",
            correct_option_id_snapshot: 1002,
            correct_option_label_snapshot: "B",
            correct_option_text_snapshot: "on",
            explanation_snapshot: "Use the preposition on.",
            question_translation_snapshot: "Tàu đến đúng giờ.",
            correct: true,
            answered_at: new Date("2026-08-02T00:01:00.000Z"),
          },
        ],
      }),
    },
  };

  const result = await new GetToeicReadingPracticeUseCase(
    prisma as never
  ).execute("learner-1", 31);

  assert.equal(result.answers.length, 1);
  assert.equal(result.answers[0]?.correctOption.id, 1002);
  assert.equal("correct" in result.content.parts[0]!.questions[0]!, false);
  assert.equal("explanation" in result.content.parts[0]!.questions[1]!, false);
});

test("get hides foreign practice sessions", async () => {
  const prisma = {
    toeic_reading_practice_sessions: { findFirst: async () => null },
  };
  await assert.rejects(
    () =>
      new GetToeicReadingPracticeUseCase(prisma as never).execute(
        "other-user",
        31
      ),
    NotFoundException
  );
});

test("grade rejects changing an already graded question", async () => {
  const prisma = {
    toeic_reading_practice_sessions: {
      findFirst: async () => storedSession,
    },
    toeic_reading_practice_answers: {
      findUnique: async ({ where }: { where: Record<string, unknown> }) =>
        "session_id_question_id_snapshot" in where
          ? { selected_option_id_snapshot: 1001 }
          : null,
    },
  };

  await assert.rejects(
    () =>
      new GradeToeicReadingPracticeAnswerUseCase(prisma as never).execute(
        "learner-1",
        31,
        {
          questionId: 101,
          optionId: 1002,
          requestKey: "00000000-0000-4000-8000-000000000002",
        }
      ),
    ConflictException
  );
});

test("grade rejects a question outside the session Part", async () => {
  const prisma = {
    toeic_reading_practice_sessions: {
      findFirst: async () => storedSession,
    },
    toeic_reading_practice_answers: { findUnique: async () => null },
    toeic_questions: { findFirst: async () => null },
  };

  await assert.rejects(
    () =>
      new GradeToeicReadingPracticeAnswerUseCase(prisma as never).execute(
        "learner-1",
        31,
        {
          questionId: 999,
          optionId: 1002,
          requestKey: "00000000-0000-4000-8000-000000000003",
        }
      ),
    BadRequestException
  );
});

test("grade returns an idempotent answer retry without incrementing again", async () => {
  const prisma = {
    toeic_reading_practice_sessions: {
      findFirst: async () => ({ ...storedSession, correct_count: 1 }),
    },
    toeic_reading_practice_answers: {
      findUnique: async () => storedAnswer,
    },
    $transaction: async () => assert.fail("retry must not write"),
  };

  const result = await new GradeToeicReadingPracticeAnswerUseCase(
    prisma as never
  ).execute("learner-1", 31, {
    questionId: 101,
    optionId: 1002,
    requestKey: "00000000-0000-4000-8000-000000000004",
  });

  assert.equal(result.correct, true);
  assert.equal(result.progress.correct, 1);
});

test("grade stores one immutable answer and increments one counter atomically", async () => {
  let createdData: Record<string, unknown> | undefined;
  let updatedData: Record<string, unknown> | undefined;
  const prisma = {
    toeic_reading_practice_sessions: {
      findFirst: async () => storedSession,
    },
    toeic_reading_practice_answers: { findUnique: async () => null },
    $transaction: async (
      operation: (transaction: Record<string, unknown>) => Promise<unknown>
    ) =>
      operation({
        toeic_reading_practice_answers: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            createdData = data;
            return {
              ...storedAnswer,
              selected_option_id_snapshot: 1001,
              correct: false,
            };
          },
        },
        toeic_reading_practice_sessions: {
          update: async ({ data }: { data: Record<string, unknown> }) => {
            updatedData = data;
            return { correct_count: 0, incorrect_count: 1 };
          },
        },
      }),
  };

  const result = await new GradeToeicReadingPracticeAnswerUseCase(
    prisma as never
  ).execute("learner-1", 31, {
    questionId: 101,
    optionId: 1001,
    requestKey: "00000000-0000-4000-8000-000000000005",
  });

  assert.equal(createdData?.selected_option_id_snapshot, 1001);
  assert.deepEqual(updatedData, { incorrect_count: { increment: 1 } });
  assert.equal(result.correct, false);
  assert.equal(result.progress.incorrect, 1);
  assert.equal(result.nextQuestionId, 102);
});

test("update validates active and marked questions against the session", async () => {
  const prisma = {
    toeic_reading_practice_sessions: {
      findFirst: async () => storedSession,
      update: async () => assert.fail("invalid navigation must not persist"),
    },
    toeic_questions: { findMany: async () => [{ id: 101 }] },
  };

  await assert.rejects(
    () =>
      new UpdateToeicReadingPracticeUseCase(prisma as never).execute(
        "learner-1",
        31,
        { activeQuestionId: 101, reviewQuestionIds: [999] }
      ),
    BadRequestException
  );
});

test("update persists valid active and marked questions", async () => {
  const updatedAt = new Date("2026-08-02T00:02:00.000Z");
  const prisma = {
    toeic_reading_practice_sessions: {
      findFirst: async () => storedSession,
      update: async () => ({
        active_question_id: 102,
        review_question_ids: [101],
        updated_at: updatedAt,
      }),
    },
    toeic_questions: { findMany: async () => [{ id: 101 }, { id: 102 }] },
  };

  const result = await new UpdateToeicReadingPracticeUseCase(
    prisma as never
  ).execute("learner-1", 31, {
    activeQuestionId: 102,
    reviewQuestionIds: [101],
  });

  assert.deepEqual(result, {
    activeQuestionId: 102,
    reviewQuestionIds: [101],
    updatedAt: updatedAt.toISOString(),
  });
});

test("complete requires every question to be graded", async () => {
  const prisma = {
    toeic_reading_practice_sessions: {
      findFirst: async () => storedSession,
    },
    toeic_questions: { count: async () => 2 },
    toeic_reading_practice_answers: { count: async () => 1 },
  };

  await assert.rejects(
    () =>
      new CompleteToeicReadingPracticeUseCase(prisma as never).execute(
        "learner-1",
        31
      ),
    ConflictException
  );
});

test("complete clears the active key and returns incorrect question ids", async () => {
  let updateData: Record<string, unknown> | undefined;
  const completedAt = new Date("2026-08-02T00:03:00.000Z");
  const prisma = {
    toeic_reading_practice_sessions: {
      findFirst: async () => ({
        ...storedSession,
        correct_count: 1,
        incorrect_count: 1,
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updateData = data;
        return {
          correct_count: 1,
          incorrect_count: 1,
          completed_at: completedAt,
        };
      },
    },
    toeic_questions: { count: async () => 2 },
    toeic_reading_practice_answers: {
      count: async () => 2,
      findMany: async () => [{ question_id_snapshot: 101 }],
    },
  };

  const result = await new CompleteToeicReadingPracticeUseCase(
    prisma as never
  ).execute("learner-1", 31);

  assert.equal(updateData?.status, "COMPLETED");
  assert.equal(updateData?.active_key, null);
  assert.deepEqual(result.incorrectQuestionIds, [101]);
  assert.equal(result.progress.answered, 2);
});
