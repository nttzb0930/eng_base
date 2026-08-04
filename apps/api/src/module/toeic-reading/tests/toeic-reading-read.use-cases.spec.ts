import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetToeicReadingOverviewUseCase } from "../use-cases/get-toeic-reading-overview.use-case";
import { GetToeicReadingTestUseCase } from "../use-cases/get-toeic-reading-test.use-case";
import { ListToeicReadingTestsUseCase } from "../use-cases/list-toeic-reading-tests.use-case";

const submittedAt = new Date("2026-07-31T00:00:00.000Z");
const storedAttempt = {
  id: 7,
  test_id: 11,
  test_title_snapshot: "Test 1",
  practice_part: null,
  correct_count: 80,
  total_count: 100,
  accuracy: 80,
  submitted_at: submittedAt,
};

test("overview reports published inventory and learner activity", async () => {
  const calls: unknown[] = [];
  const prisma = {
    toeic_tests: {
      findMany: (args: unknown) => {
        calls.push(args);
        return Promise.resolve([
          {
            id: 11,
            toeic_questions: [
              { part: 5 },
              { part: 5 },
              { part: 6 },
              { part: 7 },
            ],
          },
        ]);
      },
    },
    toeic_reading_attempts: {
      findMany: (args: unknown) => {
        calls.push(args);
        return Promise.resolve([storedAttempt]);
      },
    },
  } as unknown as PrismaService;

  const result = await new GetToeicReadingOverviewUseCase(prisma).execute(
    "learner-1"
  );

  assert.equal(result.readingAvailable, true);
  assert.equal(result.listeningAvailable, false);
  assert.equal(result.publishedTestCount, 1);
  assert.equal(result.totalQuestionCount, 4);
  assert.deepEqual(result.parts, [
    { part: 5, questionCount: 2 },
    { part: 6, questionCount: 1 },
    { part: 7, questionCount: 1 },
  ]);
  assert.equal(
    result.recentAttempts[0]?.submittedAt,
    submittedAt.toISOString()
  );
  assert.deepEqual((calls[0] as { where: unknown }).where, {
    status: "PUBLISHED",
  });
  assert.deepEqual((calls[1] as { where: unknown }).where, {
    user_id: "learner-1",
  });
});

test("test list includes per-Part counts and latest learner attempt", async () => {
  let query: unknown;
  const prisma = {
    toeic_tests: {
      findMany: (args: unknown) => {
        query = args;
        return Promise.resolve([
          {
            id: 11,
            title: "Test 1",
            source_version: "a".repeat(64),
            toeic_test_sets: { title: "2026" },
            toeic_questions: [{ part: 5 }, { part: 6 }, { part: 7 }],
            toeic_reading_attempts: [{ ...storedAttempt, practice_part: 5 }],
            toeic_reading_drafts: [
              {
                source_version: "a".repeat(64),
                active_question_id: 101,
                answers: [
                  { questionId: 101, optionId: 1001 },
                  { questionId: 102, optionId: 1002 },
                ],
                updated_at: new Date("2026-07-31T00:02:00.000Z"),
                expires_at: new Date("2099-08-30T00:02:00.000Z"),
              },
            ],
          },
        ]);
      },
    },
  } as unknown as PrismaService;

  const result = await new ListToeicReadingTestsUseCase(prisma).execute(
    "learner-1",
    5
  );

  assert.equal(result[0]?.questionCount, 1);
  assert.equal(result[0]?.sourceSetName, "2026");
  assert.equal(result[0]?.latestAttempt?.id, 7);
  assert.deepEqual(result[0]?.draftProgress, {
    answeredCount: 2,
    totalCount: 1,
    activeQuestionId: 101,
    updatedAt: "2026-07-31T00:02:00.000Z",
  });
  assert.deepEqual((query as { where: unknown }).where, {
    status: "PUBLISHED",
  });
  const attemptWhere = (
    query as {
      select: {
        toeic_reading_attempts: { where: unknown };
      };
    }
  ).select.toeic_reading_attempts.where;
  assert.deepEqual(attemptWhere, {
    user_id: "learner-1",
    practice_part: 5,
  });
  const draftWhere = (
    query as {
      select: {
        toeic_reading_drafts: { where: unknown };
      };
    }
  ).select.toeic_reading_drafts.where;
  assert.deepEqual(draftWhere, {
    user_id: "learner-1",
    scope: "PART_5",
  });
});

test("test list uses natural numeric title order inside the newest source set", async () => {
  const testRows = ["Test 10", "Test 8", "Test 5", "Test 1"].map(
    (title, index) => ({
      id: index + 1,
      title,
      source_version: String(index).repeat(64),
      toeic_test_sets: { title: "2026" },
      toeic_questions: [{ part: 5 }],
      toeic_reading_attempts: [],
      toeic_reading_drafts: [],
    })
  );
  const prisma = {
    toeic_tests: {
      findMany: () => Promise.resolve(testRows),
    },
  } as unknown as PrismaService;

  const result = await new ListToeicReadingTestsUseCase(prisma).execute(
    "learner-1",
    5
  );

  assert.deepEqual(
    result.map(({ title }) => title),
    ["Test 1", "Test 5", "Test 8", "Test 10"]
  );
});

test("test detail returns ordered learner content without answer keys", async () => {
  let query: unknown;
  const prisma = {
    toeic_tests: {
      findFirst: (args: unknown) => {
        query = args;
        return Promise.resolve({
          id: 11,
          title: "Test 1",
          source_version: "a".repeat(64),
          toeic_test_sets: { title: "2026" },
          toeic_stimuli: [
            {
              id: 20,
              part: 7,
              kind: "text",
              body: "Memo",
              translation: null,
            },
          ],
          toeic_questions: [
            {
              id: 31,
              number: 101,
              part: 5,
              stimulus_id: null,
              prompt: "The device works ___ ten and thirty degrees.",
              translation: null,
              toeic_question_options: [
                { id: 41, label: "A", text: "between" },
                { id: 42, label: "B", text: "inside" },
              ],
            },
            {
              id: 32,
              number: 181,
              part: 7,
              stimulus_id: 20,
              prompt: "What is the memo about?",
              translation: null,
              toeic_question_options: [
                { id: 43, label: "A", text: "A device" },
                { id: 44, label: "B", text: "A meeting" },
              ],
            },
          ],
        });
      },
    },
  } as unknown as PrismaService;

  const result = await new GetToeicReadingTestUseCase(prisma).execute(11, 7);

  assert.equal(result.questionCount, 1);
  assert.equal(result.sourceSetName, "2026");
  assert.deepEqual(
    result.parts.map((part) => part.part),
    [7]
  );
  assert.equal(result.parts[0]?.questions[0]?.options[0]?.label, "A");
  assert.equal(result.parts[0]?.stimuli[0]?.body, "Memo");
  assert.equal(
    JSON.stringify(result).includes("correct"),
    false,
    "wire result must not expose correctness"
  );
  assert.equal(
    JSON.stringify(query).includes("correct"),
    false,
    "Prisma detail query must not read correctness"
  );
  assert.equal(
    JSON.stringify(query).includes("explanation"),
    false,
    "Prisma detail query must not read explanations"
  );
  assert.deepEqual((query as { where: unknown }).where, {
    id: 11,
    status: "PUBLISHED",
  });
});

test("test detail hides missing or unpublished tests", async () => {
  const prisma = {
    toeic_tests: { findFirst: () => Promise.resolve(null) },
  } as unknown as PrismaService;

  await assert.rejects(
    () => new GetToeicReadingTestUseCase(prisma).execute(999),
    NotFoundException
  );
});
