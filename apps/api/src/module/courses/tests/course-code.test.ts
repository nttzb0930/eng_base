import "reflect-metadata";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { validate } from "class-validator";

import { ENGLISH_VOCABULARY_COURSE_CODE } from "../course.constants";
import { CourseCreateDto } from "../dto/course-content-management.dto";
import { ConfirmPlacementLevelUseCase } from "../../placement-test/use-cases/confirm-placement-level.use-case";

test("Placement Test selects the English course by immutable code", async () => {
  let findFirstArguments: unknown;
  const transaction = {
    placement_test_sessions: {
      findUnique: async () => ({ status: "COMPLETED" }),
      upsert: async () => undefined,
    },
    courses: {
      findFirst: async (arguments_: unknown) => {
        findFirstArguments = arguments_;
        return { id: 1 };
      },
    },
    users: {
      findUnique: async () => ({ username: "learner", full_name: null }),
    },
    user_progress: { upsert: async () => undefined },
    units: { findMany: async () => [] },
    challenge_progress: { createMany: async () => undefined },
  };
  const prisma = {
    $transaction: async (operation: (value: typeof transaction) => unknown) =>
      operation(transaction),
  };

  const useCase = new ConfirmPlacementLevelUseCase(prisma as never);
  await useCase.execute("user-1", { level: "A1" });

  assert.deepEqual(findFirstArguments, {
    where: { code: ENGLISH_VOCABULARY_COURSE_CODE },
  });
});

test("Course creation accepts only a kebab-case immutable code", async () => {
  const valid = Object.assign(new CourseCreateDto(), {
    code: "english-vocabulary",
    title: "English Vocabulary",
    imageSrc: "/mascot.svg",
  });
  assert.deepEqual(await validate(valid), []);

  const invalid = Object.assign(new CourseCreateDto(), {
    code: "English Vocabulary",
    title: "English Vocabulary",
    imageSrc: "/mascot.svg",
  });
  const errors = await validate(invalid);
  assert.equal(
    errors.some((error) => error.property === "code"),
    true
  );
});

test("Course code migration backfills before enforcing uniqueness", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations/20260719120000_add_course_code/migration.sql"
    ),
    "utf8"
  );
  const backfillPosition = migration.indexOf(
    `SET "code" = 'course-' || "id"::text`
  );
  const notNullPosition = migration.indexOf(`ALTER COLUMN "code" SET NOT NULL`);
  const uniquePosition = migration.indexOf(
    `CREATE UNIQUE INDEX "courses_code_key"`
  );

  assert.ok(backfillPosition >= 0);
  assert.ok(notNullPosition > backfillPosition);
  assert.ok(uniquePosition > notNullPosition);
});
