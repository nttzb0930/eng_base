import assert from "node:assert/strict";
import test from "node:test";

import { RefillHeartsUseCase } from "../use-cases/refill-hearts.use-case";

test("Refill Hearts uses the effective maxHearts policy", async () => {
  let refillValue: number | undefined;
  const useCase = new RefillHeartsUseCase(
    {
      user_progress: {
        updateMany: async (input: { data: { hearts: number } }) => {
          refillValue = input.data.hearts;
          return { count: 1 };
        },
        findUnique: async () => ({ user_id: "learner-1", hearts: 8 }),
      },
    } as never,
    { get: async () => 8 } as never,
  );

  const result = await useCase.execute("learner-1");

  assert.equal(refillValue, 8);
  assert.equal(result?.hearts, 8);
});
