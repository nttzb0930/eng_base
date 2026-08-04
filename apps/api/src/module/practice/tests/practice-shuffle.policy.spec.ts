import assert from "node:assert/strict";
import test from "node:test";

import { PracticeSource } from "../use-cases/practice-source";

const settings = { get: async () => 20 };

class TestPracticeSource extends PracticeSource {
  shuffleForTest<T>(items: readonly T[]) {
    return this.shuffle(items);
  }
}

test("Practice shuffle is deterministic with an injected random source", () => {
  const source = new TestPracticeSource(
    {} as never,
    settings as never,
    () => 0,
  );

  assert.deepEqual(source.shuffleForTest([1, 2, 3, 4]), [2, 3, 4, 1]);
  assert.deepEqual(source.shuffleForTest([1, 2, 3, 4]), [2, 3, 4, 1]);
});

test("Practice shuffle does not mutate its input", () => {
  const source = new TestPracticeSource(
    {} as never,
    settings as never,
    () => 0,
  );
  const input = [1, 2, 3, 4];

  source.shuffleForTest(input);

  assert.deepEqual(input, [1, 2, 3, 4]);
});
