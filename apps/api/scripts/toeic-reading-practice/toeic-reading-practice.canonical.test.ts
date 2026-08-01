import assert from "node:assert/strict";
import test from "node:test";

import {
  buildToeicReadingPracticeTest,
  sha256Canonical,
  validateToeicReadingPracticeTest,
  withSourceVersion,
} from "./toeic-reading-practice.canonical.js";

function sourceRows() {
  return Array.from({ length: 100 }, (_, index) => {
    const number = index + 101;
    const part = number <= 130 ? 5 : number <= 146 ? 6 : 7;
    const passageId =
      part === 5 ? null : `passage-${part}-${Math.floor(index / 4)}`;
    return {
      id: `question-${number}`,
      test_id: "test-2026-01",
      part,
      section: `part-${part}`,
      question_number: number,
      passage_id: passageId,
      image_url: null,
      question_text:
        number === 119
          ? "The ideal operating temperature is ------- 10 and 30 degrees."
          : `Question ${number}`,
      option_a: "at",
      option_b: "between",
      option_c: "from",
      option_d: "during",
      correct_answer: "B",
      order_index: index,
      dich_nghia: `Translation ${number}`,
      explanation_vi: `Explanation ${number}`,
    };
  });
}

function sourcePassages(questions = sourceRows()) {
  return [...new Set(questions.flatMap((row) => row.passage_id ?? []))].map(
    (id, index) => ({
      id,
      test_id: "test-2026-01",
      part: id.includes("-6-") ? 6 : 7,
      passage_type: "text",
      image_url: null,
      title: `Passage ${index + 1}`,
      order_index: index,
      passage_text: `Passage body ${index + 1}`,
      passage_text_2: null,
      passage_text_3: null,
    })
  );
}

function build(
  questions: unknown[] = sourceRows(),
  passages: unknown[] = sourcePassages()
) {
  return withSourceVersion(
    buildToeicReadingPracticeTest({
      sourceSetId: "set-2026",
      sourceSetName: "2026",
      sourceTestId: "test-2026-01",
      title: "2026 Test 1",
      questions,
      passages,
    })
  );
}

test("builds one deterministic 100-question Reading package", () => {
  const value = build();

  assert.deepEqual(
    value.parts.map(({ part, questions }) => [part, questions.length]),
    [
      [5, 30],
      [6, 16],
      [7, 54],
    ]
  );
  assert.equal(value.parts[0]?.questions[18]?.sourceNumber, 119);
  assert.equal(value.sourceSetName, "2026");
  assert.equal(validateToeicReadingPracticeTest(value).valid, true);
  assert.match(value.sourceVersion, /^[a-f0-9]{64}$/u);
  assert.equal(build().sourceVersion, value.sourceVersion);
});

test("rejects incomplete Reading packages and invalid answer keys", () => {
  const incomplete = build(
    sourceRows().filter((row) => row.question_number !== 119)
  );
  assert.equal(validateToeicReadingPracticeTest(incomplete).valid, false);

  const invalidAnswer = sourceRows();
  invalidAnswer[0] = { ...invalidAnswer[0]!, correct_answer: "E" };
  assert.throws(() => build(invalidAnswer), /correct_answer/u);
});

test("dynamic source statistics do not affect the content digest", () => {
  const value = build();
  assert.equal(
    sha256Canonical({ ...value, practiceStats: [{ errorRate: 0.1 }] }),
    sha256Canonical({ ...value, practiceStats: [{ errorRate: 0.9 }] })
  );
});
