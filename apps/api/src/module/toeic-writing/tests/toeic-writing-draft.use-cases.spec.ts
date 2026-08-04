import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { DeleteToeicWritingDraftUseCase } from "../use-cases/delete-toeic-writing-draft.use-case";
import { GetToeicWritingDraftUseCase } from "../use-cases/get-toeic-writing-draft.use-case";
import { SaveToeicWritingDraftUseCase } from "../use-cases/save-toeic-writing-draft.use-case";

const version = "a".repeat(64);

function responseCode(error: unknown) {
  return (
    error as { getResponse(): { statusCode: number; code: string } }
  ).getResponse();
}

function savePrisma(input: { part?: 1 | 2; sourceVersion?: string } = {}) {
  const calls: unknown[] = [];
  const prisma = {
    toeic_writing_tasks: {
      findFirst: () =>
        Promise.resolve({
          id: 11,
          part: input.part ?? 1,
          source_version: input.sourceVersion ?? version,
        }),
    },
    toeic_writing_drafts: {
      upsert: (args: unknown) => {
        calls.push(args);
        return Promise.resolve({
          id: 31,
          task_id: 11,
          content_version: version,
          response_text: "  The woman is holding a phone.  ",
          updated_at: new Date("2026-08-03T01:02:03.000Z"),
        });
      },
    },
  } as unknown as PrismaService;
  return { prisma, calls };
}

test("Part 1 draft rejects more than 300 trimmed characters", async () => {
  const { prisma, calls } = savePrisma();
  const save = new SaveToeicWritingDraftUseCase(prisma);

  await assert.rejects(
    () =>
      save.execute("learner-1", 11, {
        contentVersion: version,
        responseText: `  ${"x".repeat(301)}  `,
      }),
    (error: unknown) => {
      const response = responseCode(error);
      return (
        response.statusCode === 400 &&
        response.code === "WRITING_RESPONSE_INVALID"
      );
    }
  );
  assert.equal(calls.length, 0);
});

test("Part 2 draft accepts 2200 trimmed characters and preserves original whitespace", async () => {
  const { prisma, calls } = savePrisma({ part: 2 });
  const responseText = `  ${"x".repeat(2_200)}  `;

  await new SaveToeicWritingDraftUseCase(prisma).execute("learner-1", 11, {
    contentVersion: version,
    responseText,
  });

  const create = calls[0] as {
    create: { response_text: string };
    update: { response_text: string };
  };
  assert.equal(create.create.response_text, responseText);
  assert.equal(create.update.response_text, responseText);
});

test("Part 1 draft counts astral Unicode characters as one code point", async () => {
  const { prisma, calls } = savePrisma();
  const responseText = `  ${"😀".repeat(300)}  `;

  await new SaveToeicWritingDraftUseCase(prisma).execute("learner-1", 11, {
    contentVersion: version,
    responseText,
  });

  assert.equal(calls.length, 1);
});

test("stale content version keeps the existing draft", async () => {
  const { prisma, calls } = savePrisma();
  const save = new SaveToeicWritingDraftUseCase(prisma);

  await assert.rejects(
    () =>
      save.execute("learner-1", 11, {
        contentVersion: "b".repeat(64),
        responseText: "answer",
      }),
    (error: unknown) => {
      const response = responseCode(error);
      return (
        response.statusCode === 409 &&
        response.code === "WRITING_CONTENT_VERSION_CONFLICT"
      );
    }
  );
  assert.equal(calls.length, 0);
});

test("draft reads are scoped to the current learner and task", async () => {
  const calls: unknown[] = [];
  const prisma = {
    toeic_writing_tasks: {
      findFirst: () => Promise.resolve({ id: 11 }),
    },
    toeic_writing_drafts: {
      findUnique: (args: unknown) => {
        calls.push(args);
        return Promise.resolve({
          id: 31,
          task_id: 11,
          content_version: version,
          response_text: "answer",
          updated_at: new Date("2026-08-03T01:02:03.000Z"),
        });
      },
    },
  } as unknown as PrismaService;

  const result = await new GetToeicWritingDraftUseCase(prisma).execute(
    "learner-2",
    11
  );

  assert.deepEqual((calls[0] as { where: unknown }).where, {
    user_id_task_id: { user_id: "learner-2", task_id: 11 },
  });
  assert.deepEqual(result, {
    id: 31,
    taskId: 11,
    contentVersion: version,
    responseText: "answer",
    updatedAt: "2026-08-03T01:02:03.000Z",
  });
});

test("missing learner draft returns null without reading another user", async () => {
  const prisma = {
    toeic_writing_tasks: {
      findFirst: () => Promise.resolve({ id: 11 }),
    },
    toeic_writing_drafts: {
      findUnique: () => Promise.resolve(null),
    },
  } as unknown as PrismaService;

  assert.equal(
    await new GetToeicWritingDraftUseCase(prisma).execute("learner-1", 11),
    null
  );
});

test("draft deletion uses both learner and task identity", async () => {
  const calls: unknown[] = [];
  const prisma = {
    toeic_writing_tasks: {
      findFirst: () => Promise.resolve({ id: 11 }),
    },
    toeic_writing_drafts: {
      deleteMany: (args: unknown) => {
        calls.push(args);
        return Promise.resolve({ count: 1 });
      },
    },
  } as unknown as PrismaService;

  const result = await new DeleteToeicWritingDraftUseCase(prisma).execute(
    "learner-1",
    11
  );

  assert.deepEqual((calls[0] as { where: unknown }).where, {
    user_id: "learner-1",
    task_id: 11,
  });
  assert.deepEqual(result, { deleted: true });
});
