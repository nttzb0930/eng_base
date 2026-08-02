import assert from "node:assert/strict";
import test from "node:test";

import { PracticeSource } from "../use-cases/practice-source";

class TestPracticeSource extends PracticeSource {
  readItems(userId: string, lessonNumber: number) {
    return this.getPracticeVocabularyItems(userId, undefined, lessonNumber);
  }

  readWeakLimit() {
    return this.getWeakWordsLimit();
  }
}

test("Practice source uses effective lesson and weak-word limits", async () => {
  let query: Record<string, unknown> | undefined;
  const source = new TestPracticeSource(
    {
      vocabulary_items: {
        findMany: async (input: Record<string, unknown>) => {
          query = input;
          return [];
        },
      },
    } as never,
    {
      get: async (field: string) =>
        field === "practiceWordsPerLesson" ? 7 : 11,
    } as never,
  );

  await source.readItems("learner-1", 3);

  assert.equal(query?.skip, 14);
  assert.equal(query?.take, 7);
  assert.equal(await source.readWeakLimit(), 11);
});
