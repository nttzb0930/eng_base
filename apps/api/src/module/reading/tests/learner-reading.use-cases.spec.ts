import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetReadingAttemptUseCase } from "../use-cases/get-reading-attempt.use-case";
import { GetReadingPassageUseCase } from "../use-cases/get-reading-passage.use-case";
import { ListReadingAttemptsUseCase } from "../use-cases/list-reading-attempts.use-case";
import { ListReadingPassagesUseCase } from "../use-cases/list-reading-passages.use-case";

test("learner list reads published A1 passages and learner latest attempts", async () => {
  const calls: unknown[] = [];
  const prisma = {
    reading_passages: {
      findMany: (args: unknown) => {
        calls.push(args);
        return Promise.resolve([]);
      },
    },
  } as unknown as PrismaService;

  assert.deepEqual(
    await new ListReadingPassagesUseCase(prisma).execute("learner-1", "A1"),
    [],
  );
  assert.deepEqual(
    (calls[0] as { where: unknown }).where,
    { cefr_level: "A1", status: "PUBLISHED" },
  );
  assert.deepEqual(
    (
      calls[0] as {
        select: { reading_attempts: { where: unknown } };
      }
    ).select.reading_attempts.where,
    { user_id: "learner-1" },
  );
});

test("learner detail selects no correctness field before submission", async () => {
  const calls: unknown[] = [];
  const prisma = {
    reading_passages: {
      findFirst: (args: unknown) => {
        calls.push(args);
        return Promise.resolve({
          id: 1,
          slug: "a-day-in-hanoi",
          title: "A Day in Hanoi",
          body: "Mia lives in Hanoi.",
          cefr_level: "A1",
          estimated_minutes: 3,
          vocabulary_topics: null,
          reading_questions: [],
        });
      },
    },
  } as unknown as PrismaService;

  const result = await new GetReadingPassageUseCase(prisma).execute(
    "a-day-in-hanoi",
  );
  assert.equal(result.slug, "a-day-in-hanoi");
  assert.doesNotMatch(JSON.stringify(calls[0]), /"correct"/);
  assert.deepEqual(
    (calls[0] as { where: unknown }).where,
    { slug: "a-day-in-hanoi", status: "PUBLISHED" },
  );
});

test("learner history and result reads are scoped to authenticated identity", async () => {
  const calls: unknown[] = [];
  const prisma = {
    reading_attempts: {
      findMany: (args: unknown) => {
        calls.push(args);
        return Promise.resolve([]);
      },
      findFirst: (args: unknown) => {
        calls.push(args);
        return Promise.resolve(null);
      },
    },
  } as unknown as PrismaService;

  assert.deepEqual(
    await new ListReadingAttemptsUseCase(prisma).execute("learner-1", "A1"),
    [],
  );
  await assert.rejects(
    () => new GetReadingAttemptUseCase(prisma).execute("learner-2", 9),
    NotFoundException,
  );
  assert.equal(
    JSON.stringify(calls).match(/learner-1/g)?.length,
    1,
  );
  assert.equal(
    JSON.stringify(calls).match(/learner-2/g)?.length,
    1,
  );
});
