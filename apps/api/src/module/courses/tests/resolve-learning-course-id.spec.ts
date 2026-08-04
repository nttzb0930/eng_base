import assert from "node:assert/strict";
import test from "node:test";

import { resolveLearningCourseId } from "../use-cases/resolve-learning-course-id";

test("learning course resolution prefers the canonical English vocabulary course", async () => {
  const calls: unknown[] = [];
  const result = await resolveLearningCourseId(
    {
      courses: {
        findUnique: async (args) => {
          calls.push(args);
          return { id: 11 };
        },
      },
    },
    99
  );

  assert.equal(result, 11);
  assert.deepEqual(calls, [
    {
      where: { code: "english-vocabulary" },
      select: { id: true },
    },
  ]);
});

test("learning course resolution falls back to the active course when canonical content is absent", async () => {
  const result = await resolveLearningCourseId(
    {
      courses: {
        findUnique: async () => null,
      },
    },
    99
  );

  assert.equal(result, 99);
});
