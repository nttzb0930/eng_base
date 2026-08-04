import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetToeicListeningOverviewUseCase } from "../use-cases/get-toeic-listening-overview.use-case";
import { GetToeicListeningTestUseCase } from "../use-cases/get-toeic-listening-test.use-case";
import { ListToeicListeningTestsUseCase } from "../use-cases/list-toeic-listening-tests.use-case";

test("overview reports only published Listening inventory", async () => {
  let query: unknown;
  const prisma = {
    toeic_tests: {
      findMany: (args: unknown) => {
        query = args;
        return Promise.resolve([
          {
            id: 11,
            toeic_questions: [
              { part: 1 },
              { part: 2 },
              { part: 3 },
              { part: 4 },
            ],
          },
        ]);
      },
    },
  } as unknown as PrismaService;

  const result = await new GetToeicListeningOverviewUseCase(prisma).execute();

  assert.deepEqual(result, {
    listeningAvailable: true,
    publishedTestCount: 1,
    totalQuestionCount: 4,
    parts: [
      { part: 1, questionCount: 1 },
      { part: 2, questionCount: 1 },
      { part: 3, questionCount: 1 },
      { part: 4, questionCount: 1 },
    ],
  });
  assert.deepEqual((query as { where: unknown }).where, {
    listening_status: "PUBLISHED",
    listening_source_version: { not: null },
  });
});

test("test list filters a selected Part and uses natural title order", async () => {
  let query: unknown;
  const prisma = {
    toeic_tests: {
      findMany: (args: unknown) => {
        query = args;
        return Promise.resolve(
          ["Test 10", "Test 2", "Test 1"].map((title, index) => ({
            id: index + 1,
            title,
            listening_source_version: String(index).repeat(64),
            toeic_test_sets: { title: "2026" },
            toeic_questions: [{ part: 2 }, { part: 2 }],
            toeic_listening_drafts: [
              {
                listening_source_version: String(index).repeat(64),
                answers: [{ questionId: 1, optionId: 2 }],
                active_question_id: 1,
                updated_at: new Date("2026-08-01T00:00:00Z"),
              },
            ],
            toeic_listening_attempts: [
              {
                id: 91,
                test_id: index + 1,
                test_title_snapshot: title,
                practice_part: 2,
                correct_count: 18,
                total_count: 25,
                accuracy: 72,
                submitted_at: new Date("2026-08-01T01:00:00Z"),
              },
            ],
          }))
        );
      },
    },
  } as unknown as PrismaService;

  const result = await new ListToeicListeningTestsUseCase(prisma).execute(
    "user-1",
    2
  );

  assert.deepEqual(
    result.map(({ title }) => title),
    ["Test 1", "Test 2", "Test 10"]
  );
  assert.equal(result[0]?.questionCount, 2);
  assert.equal(result[0]?.draftProgress?.answeredCount, 1);
  assert.deepEqual(result[0]?.latestAttempt, {
    id: 91,
    testId: 3,
    testTitle: "Test 1",
    practicePart: 2,
    correctCount: 18,
    totalCount: 25,
    accuracy: 72,
    submittedAt: "2026-08-01T01:00:00.000Z",
  });
  assert.deepEqual(
    (
      query as {
        select: { toeic_questions: { where: unknown } };
      }
    ).select.toeic_questions.where,
    { part: 2 }
  );
});

test("test detail omits answer keys and private Listening review fields", async () => {
  let query: unknown;
  const prisma = {
    toeic_tests: {
      findFirst: (args: unknown) => {
        query = args;
        return Promise.resolve({
          id: 11,
          title: "Test 1",
          listening_source_version: "a".repeat(64),
          toeic_test_sets: { title: "2026" },
          toeic_stimuli: [
            {
              id: 21,
              part: 3,
              toeic_media_bindings: [
                { media_asset_id: 501, role: "AUDIO", order: 0 },
              ],
            },
          ],
          toeic_questions: [
            {
              id: 31,
              number: 1,
              part: 1,
              stimulus_id: null,
              prompt: "",
              toeic_media_bindings: [
                { media_asset_id: 502, role: "AUDIO", order: 0 },
                { media_asset_id: 503, role: "IMAGE", order: 0 },
              ],
              toeic_question_options: [
                { id: 41, label: "A", text: "hidden source text" },
                { id: 42, label: "B", text: "hidden source text" },
              ],
            },
            {
              id: 32,
              number: 32,
              part: 3,
              stimulus_id: 21,
              prompt: "What does the woman suggest?",
              toeic_media_bindings: [],
              toeic_question_options: [
                { id: 43, label: "A", text: "Call tomorrow" },
                { id: 44, label: "B", text: "Visit today" },
              ],
            },
          ],
        });
      },
    },
  } as unknown as PrismaService;

  const result = await new GetToeicListeningTestUseCase(prisma).execute(11);

  assert.equal(result.questionCount, 2);
  assert.equal(result.parts[0]?.questions[0]?.prompt, null);
  assert.equal(result.parts[0]?.questions[0]?.options[0]?.text, null);
  assert.equal(result.parts[0]?.questions[0]?.audioMediaId, 502);
  assert.deepEqual(result.parts[0]?.questions[0]?.imageMediaIds, [503]);
  assert.equal(
    result.parts[2]?.questions[0]?.options[0]?.text,
    "Call tomorrow"
  );
  assert.equal(result.parts[2]?.stimuli[0]?.audioMediaId, 501);

  const serializedResult = JSON.stringify(result);
  const serializedQuery = JSON.stringify(query);
  for (const privateField of [
    "correct",
    "transcript",
    "translation",
    "explanation",
    "source_url",
    "storage_path",
  ]) {
    assert.equal(serializedResult.includes(privateField), false);
    assert.equal(serializedQuery.includes(privateField), false);
  }
  assert.deepEqual((query as { where: unknown }).where, {
    id: 11,
    listening_status: "PUBLISHED",
    listening_source_version: { not: null },
  });
});

test("test detail rejects missing and empty selected Parts", async () => {
  const missingPrisma = {
    toeic_tests: { findFirst: () => Promise.resolve(null) },
  } as unknown as PrismaService;
  await assert.rejects(
    () => new GetToeicListeningTestUseCase(missingPrisma).execute(999),
    NotFoundException
  );

  const emptyPartPrisma = {
    toeic_tests: {
      findFirst: () =>
        Promise.resolve({
          id: 11,
          title: "Test 1",
          listening_source_version: "a".repeat(64),
          toeic_test_sets: { title: "2026" },
          toeic_stimuli: [],
          toeic_questions: [],
        }),
    },
  } as unknown as PrismaService;
  await assert.rejects(
    () => new GetToeicListeningTestUseCase(emptyPartPrisma).execute(11, 4),
    NotFoundException
  );
});
