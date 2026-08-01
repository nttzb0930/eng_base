import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ConflictException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { DeleteToeicReadingDraftUseCase } from "../use-cases/delete-toeic-reading-draft.use-case";
import { GetToeicReadingDraftUseCase } from "../use-cases/get-toeic-reading-draft.use-case";
import { SaveToeicReadingDraftUseCase } from "../use-cases/save-toeic-reading-draft.use-case";

const sourceVersion = "a".repeat(64);
const storedTest = {
  id: 11,
  source_version: sourceVersion,
  toeic_questions: [
    {
      id: 101,
      part: 5,
      toeic_question_options: [{ id: 1001 }, { id: 1002 }],
    },
    {
      id: 102,
      part: 5,
      toeic_question_options: [{ id: 1003 }, { id: 1004 }],
    },
  ],
};
const payload = {
  sourceVersion,
  practicePart: 5 as const,
  activeQuestionId: 102,
  answers: [{ questionId: 101, optionId: 1001 }],
  reviewQuestionIds: [102],
};
const storedDraft = {
  id: 1,
  user_id: "learner-1",
  test_id: 11,
  scope: "PART_5",
  source_version: sourceVersion,
  active_question_id: 102,
  answers: payload.answers,
  review_question_ids: [102],
  created_at: new Date("2026-07-31T00:00:00.000Z"),
  updated_at: new Date("2026-07-31T00:01:00.000Z"),
  expires_at: new Date("2026-08-30T00:01:00.000Z"),
};

test("validates and atomically upserts an account-owned scoped draft", async () => {
  const upserts: unknown[] = [];
  const prisma = {
    toeic_tests: { findFirst: () => Promise.resolve(storedTest) },
    toeic_reading_drafts: {
      upsert: (args: unknown) => {
        upserts.push(args);
        return Promise.resolve(storedDraft);
      },
    },
  } as unknown as PrismaService;

  const before = Date.now();
  const result = await new SaveToeicReadingDraftUseCase(prisma).execute(
    "learner-1",
    11,
    payload
  );

  assert.equal(result.testId, 11);
  assert.equal(result.practicePart, 5);
  const args = upserts[0] as {
    where: unknown;
    create: { user_id: string; scope: string; expires_at: Date };
  };
  assert.deepEqual(args.where, {
    user_id_test_id_scope: {
      user_id: "learner-1",
      test_id: 11,
      scope: "PART_5",
    },
  });
  assert.equal(args.create.user_id, "learner-1");
  assert.equal(args.create.scope, "PART_5");
  assert.ok(args.create.expires_at.getTime() >= before + 29 * 86_400_000);
});

test("rejects foreign options and duplicate identifiers before persistence", async () => {
  let writes = 0;
  const prisma = {
    toeic_tests: { findFirst: () => Promise.resolve(storedTest) },
    toeic_reading_drafts: {
      upsert: () => {
        writes += 1;
        return Promise.resolve(storedDraft);
      },
    },
  } as unknown as PrismaService;
  const useCase = new SaveToeicReadingDraftUseCase(prisma);

  await assert.rejects(
    () =>
      useCase.execute("learner-1", 11, {
        ...payload,
        answers: [{ questionId: 101, optionId: 1004 }],
      }),
    BadRequestException
  );
  await assert.rejects(
    () =>
      useCase.execute("learner-1", 11, {
        ...payload,
        reviewQuestionIds: [102, 102],
      }),
    BadRequestException
  );
  assert.equal(writes, 0);
});

test("preserves a draft when the published source version changed", async () => {
  const prisma = {
    toeic_tests: {
      findFirst: () =>
        Promise.resolve({ ...storedTest, source_version: "b".repeat(64) }),
    },
    toeic_reading_drafts: {
      upsert: () => {
        throw new Error("must not write");
      },
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      new SaveToeicReadingDraftUseCase(prisma).execute(
        "learner-1",
        11,
        payload
      ),
    ConflictException
  );
});

test("reads only the matching account and scope and removes expired drafts", async () => {
  const queries: unknown[] = [];
  const deletes: unknown[] = [];
  const prisma = {
    toeic_reading_drafts: {
      findUnique: (args: unknown) => {
        queries.push(args);
        return Promise.resolve({
          ...storedDraft,
          expires_at: new Date("2020-01-01T00:00:00.000Z"),
          toeic_tests: { source_version: sourceVersion, status: "PUBLISHED" },
        });
      },
      deleteMany: (args: unknown) => {
        deletes.push(args);
        return Promise.resolve({ count: 1 });
      },
    },
  } as unknown as PrismaService;

  const result = await new GetToeicReadingDraftUseCase(prisma).execute(
    "learner-2",
    11,
    5
  );

  assert.equal(result, null);
  assert.deepEqual((queries[0] as { where: unknown }).where, {
    user_id_test_id_scope: {
      user_id: "learner-2",
      test_id: 11,
      scope: "PART_5",
    },
  });
  assert.equal(deletes.length, 1);
});

test("deletes only the authenticated learner's matching draft", async () => {
  const deletes: unknown[] = [];
  const prisma = {
    toeic_reading_drafts: {
      deleteMany: (args: unknown) => {
        deletes.push(args);
        return Promise.resolve({ count: 1 });
      },
    },
  } as unknown as PrismaService;

  const result = await new DeleteToeicReadingDraftUseCase(prisma).execute(
    "learner-1",
    11,
    undefined
  );

  assert.deepEqual(result, { deleted: true });
  assert.deepEqual((deletes[0] as { where: unknown }).where, {
    user_id: "learner-1",
    test_id: 11,
    scope: "FULL",
  });
});
