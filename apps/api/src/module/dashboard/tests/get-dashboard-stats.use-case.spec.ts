import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { GetDashboardStatsUseCase } from "../use-cases/get-dashboard-stats.use-case";

const dateKey = (offset: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const learningDay = (offset: number) => ({
  date: dateKey(offset),
  last_learning_at: new Date(`${dateKey(offset)}T10:00:00.000Z`),
});

function createPrismaMock() {
  let streakQuery = "";
  const prisma = {
    vocabulary_items: {
      count: async () => 100,
      groupBy: async () => [],
    },
    user_saved_words: {
      count: async () => 3,
    },
    user_vocabulary_progress: {
      findMany: async () => [],
      count: async () => 0,
    },
    practice_sessions: {
      findMany: async () => [],
      groupBy: async () => [],
    },
    $queryRaw: async (strings: TemplateStringsArray) => {
      streakQuery = strings.join("?");
      return [
        learningDay(-14),
        learningDay(-13),
        learningDay(-12),
        learningDay(-11),
        learningDay(-1),
        learningDay(0),
      ];
    },
  };

  return {
    prisma: prisma as unknown as PrismaService,
    getStreakQuery: () => streakQuery,
  };
}

test("Dashboard composes a server-owned streak from qualifying learning days", async () => {
  const { prisma, getStreakQuery } = createPrismaMock();
  const result = await new GetDashboardStatsUseCase(prisma).execute("user-1");

  assert.deepEqual(result.streak, {
    currentStreak: 2,
    longestStreak: 4,
    lastLearningAt: new Date(`${dateKey(0)}T10:00:00.000Z`),
    timeZone: "UTC",
  });
  assert.match(getStreakQuery(), /correct_count \+ wrong_count > 0/);
  assert.match(getStreakQuery(), /AT TIME ZONE 'UTC'/);
});

test("Dashboard without a user returns a zero streak without querying Prisma", async () => {
  const prisma = new Proxy(
    {},
    {
      get() {
        throw new Error("Prisma must not be queried");
      },
    }
  ) as PrismaService;

  const result = await new GetDashboardStatsUseCase(prisma).execute("");

  assert.deepEqual(result.streak, {
    currentStreak: 0,
    longestStreak: 0,
    lastLearningAt: null,
    timeZone: "UTC",
  });
});
