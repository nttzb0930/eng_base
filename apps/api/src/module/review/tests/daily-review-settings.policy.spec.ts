import assert from "node:assert/strict";
import test from "node:test";

import { DailyReviewSource } from "../use-cases/daily-review-source";

class TestDailyReviewSource extends DailyReviewSource {
  readCandidates(userId: string) {
    return this.getDailyReviewCandidateIds(userId);
  }
}

test("Daily Review selects the configured limit for every intensity", async () => {
  const limits = {
    relaxed: 2,
    standard: 3,
    accelerated: 4,
    intensive: 6,
  } as const;

  for (const [intensity, expectedLimit] of Object.entries(limits)) {
    const takes: number[] = [];
    const source = new TestDailyReviewSource(
      {
        user_progress: {
          findUnique: async () => ({ intensity }),
        },
        user_vocabulary_progress: {
          findMany: async (input: { take: number }) => {
            takes.push(input.take);
            return [];
          },
        },
        user_saved_words: {
          findMany: async (input: { take: number }) => {
            takes.push(input.take);
            return [];
          },
        },
      } as never,
      {} as never,
      {
        getAll: async () => ({
          maxHearts: 5,
          practiceWordsPerLesson: 15,
          weakWordsLimit: 20,
          dailyReviewRelaxedLimit: limits.relaxed,
          dailyReviewStandardLimit: limits.standard,
          dailyReviewAcceleratedLimit: limits.accelerated,
          dailyReviewIntensiveLimit: limits.intensive,
          registrationEnabled: true,
        }),
      } as never,
    );

    await source.readCandidates("learner-1");
    assert.deepEqual(takes, Array(4).fill(expectedLimit));
  }
});
