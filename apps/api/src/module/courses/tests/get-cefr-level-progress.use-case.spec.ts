import assert from "node:assert/strict";
import test from "node:test";
import type { CefrLevelProgress } from "@repo/shared";

import { applyCefrUnlockPolicy } from "../use-cases/cefr-level-progress.policy";
import { GetCefrLevelProgressUseCase } from "../use-cases/get-cefr-level-progress.use-case";

type LevelWithoutUnlock = Omit<CefrLevelProgress, "unlocked">;

const emptyLevels = (): LevelWithoutUnlock[] =>
  (["A1", "A2", "B1", "B2"] as const).map((level) => ({
    level,
    totalWords: 100,
    learnedWords: 0,
    masteredWords: 0,
    completedLessons: 0,
    totalLessons: 0,
  }));

test("CEFR unlock policy opens the confirmed placement level and every lower level", () => {
  const levels = emptyLevels();
  levels[0] = { ...levels[0]!, learnedWords: 79, masteredWords: 79 };

  const result = applyCefrUnlockPolicy(levels, "B1");

  assert.equal(result[0]?.unlocked, true);
  assert.equal(result[1]?.unlocked, true);
  assert.equal(result[2]?.unlocked, true);
  assert.equal(result[3]?.unlocked, false);
});

test("CEFR unlock policy opens the next level at exactly 80 percent mastery", () => {
  const levels = emptyLevels();
  levels[0] = { ...levels[0]!, learnedWords: 80, masteredWords: 80 };

  const result = applyCefrUnlockPolicy(levels, null);

  assert.equal(result[1]?.unlocked, true);
});

test("CEFR unlock policy does not open the next level from an empty catalog", () => {
  const levels = emptyLevels();
  levels[0] = { ...levels[0]!, totalWords: 0 };

  const result = applyCefrUnlockPolicy(levels, null);

  assert.equal(result[1]?.unlocked, false);
});

test("CEFR progress summary aggregates user vocabulary and completed lessons", async () => {
  let progressQuery: unknown;
  let unitQuery: unknown;
  const prisma = {
    user_progress: {
      findUnique: async () => ({ active_course_id: 7 }),
    },
    placement_test_sessions: {
      findUnique: async () => ({ confirmed_level: null }),
    },
    vocabulary_items: {
      groupBy: async () => [
        { cefr_level: "A1", _count: { _all: 2 } },
        { cefr_level: "A2", _count: { _all: 1 } },
      ],
    },
    user_vocabulary_progress: {
      findMany: async (query: unknown) => {
        progressQuery = query;
        return [
          {
            mastery_level: "mastered",
            vocabulary_items: { cefr_level: "A1" },
          },
          {
            mastery_level: "learning",
            vocabulary_items: { cefr_level: "A1" },
          },
          {
            mastery_level: "mastered",
            vocabulary_items: { cefr_level: "A2" },
          },
        ];
      },
    },
    units: {
      findMany: async (query: unknown) => {
        unitQuery = query;
        return [
          {
            cefr_level: "A1",
            lessons: [
              {
                challenges: [
                  { challenge_progress: [{ completed: true }] },
                  { challenge_progress: [{ completed: true }] },
                ],
              },
              { challenges: [] },
            ],
          },
          {
            cefr_level: "A2",
            lessons: [
              {
                challenges: [{ challenge_progress: [{ completed: false }] }],
              },
            ],
          },
        ];
      },
    },
  };

  const result = await new GetCefrLevelProgressUseCase(prisma as never).execute(
    "user-1"
  );

  assert.equal(result.totalWords, 3);
  assert.deepEqual(result.levels, [
    {
      level: "A1",
      totalWords: 2,
      learnedWords: 2,
      masteredWords: 1,
      completedLessons: 1,
      totalLessons: 2,
      unlocked: true,
    },
    {
      level: "A2",
      totalWords: 1,
      learnedWords: 1,
      masteredWords: 1,
      completedLessons: 0,
      totalLessons: 1,
      unlocked: false,
    },
    {
      level: "B1",
      totalWords: 0,
      learnedWords: 0,
      masteredWords: 0,
      completedLessons: 0,
      totalLessons: 0,
      unlocked: true,
    },
    {
      level: "B2",
      totalWords: 0,
      learnedWords: 0,
      masteredWords: 0,
      completedLessons: 0,
      totalLessons: 0,
      unlocked: false,
    },
  ]);
  assert.deepEqual(progressQuery, {
    where: { user_id: "user-1" },
    select: {
      mastery_level: true,
      vocabulary_items: { select: { cefr_level: true } },
    },
  });
  assert.deepEqual(unitQuery, {
    where: { course_id: 7, cefr_level: { not: null } },
    select: {
      cefr_level: true,
      lessons: {
        select: {
          challenges: {
            select: {
              challenge_progress: {
                where: { user_id: "user-1" },
                select: { completed: true },
              },
            },
          },
        },
      },
    },
  });
});

test("CEFR progress summary keeps lesson totals at zero without an active course", async () => {
  let unitsQueried = false;
  const prisma = {
    user_progress: {
      findUnique: async () => ({ active_course_id: null }),
    },
    placement_test_sessions: {
      findUnique: async () => ({ confirmed_level: null }),
    },
    vocabulary_items: {
      groupBy: async () => [{ cefr_level: "A1", _count: { _all: 4 } }],
    },
    user_vocabulary_progress: {
      findMany: async () => [],
    },
    units: {
      findMany: async () => {
        unitsQueried = true;
        return [];
      },
    },
  };

  const result = await new GetCefrLevelProgressUseCase(prisma as never).execute(
    "user-1"
  );

  assert.equal(unitsQueried, false);
  assert.equal(result.totalWords, 4);
  assert.equal(
    result.levels.every((level) => level.totalLessons === 0),
    true
  );
});
