import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../../../database/prisma/prisma.service";
import { CompleteChallengeUseCase } from "../use-cases/complete-challenge.use-case";

function createProgressFixture() {
  const state = {
    points: 0,
    hearts: 5,
    challengeProgress: null as null | {
      id: number;
      user_id: string;
      challenge_id: number;
      completed: boolean;
    },
  };
  const transaction = {
    user_progress: {
      findUnique: async () => ({
        user_id: "learner-1",
        points: state.points,
        hearts: state.hearts,
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        const points = data.points as { increment?: number } | undefined;
        if (points?.increment) state.points += points.increment;
        if (typeof data.hearts === "number") state.hearts = data.hearts;
      },
    },
    challenges: { findUnique: async () => ({ id: 101 }) },
    challenge_progress: {
      findUnique: async () => state.challengeProgress,
      createMany: async () => {
        if (state.challengeProgress) return { count: 0 };
        state.challengeProgress = {
          id: 1,
          user_id: "learner-1",
          challenge_id: 101,
          completed: true,
        };
        return { count: 1 };
      },
    },
    system_settings: { findUnique: async () => ({ value: "5" }) },
  };
  const prisma = {
    $transaction: async (operation: (tx: typeof transaction) => unknown) =>
      operation(transaction),
  } as unknown as PrismaService;

  return { state, useCase: new CompleteChallengeUseCase(prisma) };
}

test("completing the same challenge twice awards points only once", async () => {
  const { state, useCase } = createProgressFixture();

  await useCase.execute("learner-1", 101);
  await useCase.execute("learner-1", 101);

  assert.equal(state.points, 10);
  assert.equal(state.hearts, 5);
});

test("concurrent challenge completion awards points to only one request", async () => {
  const state = { points: 0, created: false };
  const transaction = {
    user_progress: {
      findUnique: async () => ({ user_id: "learner-1", hearts: 5 }),
      update: async () => {
        state.points += 10;
      },
    },
    challenges: { findUnique: async () => ({ id: 101 }) },
    challenge_progress: {
      findUnique: async () => (state.created ? { id: 1 } : null),
      createMany: async () => {
        if (state.created) return { count: 0 };
        state.created = true;
        return { count: 1 };
      },
    },
  };
  const prisma = {
    $transaction: async (operation: (tx: typeof transaction) => unknown) =>
      operation(transaction),
  } as unknown as PrismaService;
  const useCase = new CompleteChallengeUseCase(prisma);

  await Promise.all([
    useCase.execute("learner-1", 101),
    useCase.execute("learner-1", 101),
  ]);

  assert.equal(state.points, 10);
});
