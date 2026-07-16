import assert from "node:assert/strict";
import test from "node:test";

import {
  getBlankedExample,
  getDistractors,
  type ReviewSourceItem,
} from "../builders/vocabulary-challenge.builder";

test("blank builder recognizes common inflected word forms", () => {
  const result = getBlankedExample(
    {
      word: "study",
      exampleEn: null,
      vocabularyExamples: [{ exampleEn: "She studied English yesterday." }],
    },
    () => 0.5
  );

  assert.equal(result, "She _____ English yesterday.");
});

test("distractor builder excludes duplicate and overlapping meanings", () => {
  const target: ReviewSourceItem = {
    id: 1,
    word: "bear",
    pos: "noun",
    cefrLevel: "A1",
    primaryMeaningVi: "con gấu",
    meaningVi: "con gấu",
  };
  const pool: ReviewSourceItem[] = [
    target,
    {
      ...target,
      id: 2,
      word: "grizzly",
      primaryMeaningVi: "gấu xám",
      meaningVi: "một con gấu lớn",
    },
    {
      ...target,
      id: 3,
      word: "cat",
      primaryMeaningVi: "con mèo",
      meaningVi: "con mèo",
    },
    {
      ...target,
      id: 4,
      word: "dog",
      primaryMeaningVi: "con chó",
      meaningVi: "con chó",
    },
  ];

  const distractors = getDistractors(target, pool, 2, () => 0.5);

  assert.deepEqual(
    distractors.map((item) => item.word),
    ["cat", "dog"]
  );
});
