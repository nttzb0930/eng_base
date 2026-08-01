import assert from "node:assert/strict";
import test from "node:test";

import { mapToeicDictationMediaWithConcurrency } from "./toeic-dictation.download";

test("dictation download mapper bounds concurrent workers and keeps order", async () => {
  let active = 0;
  let maxActive = 0;
  const result = await mapToeicDictationMediaWithConcurrency(
    [1, 2, 3, 4, 5],
    2,
    async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return value * 2;
    }
  );

  assert.equal(maxActive, 2);
  assert.deepEqual(result, [2, 4, 6, 8, 10]);
});
