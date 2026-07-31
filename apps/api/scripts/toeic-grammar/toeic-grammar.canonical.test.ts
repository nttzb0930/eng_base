import assert from "node:assert/strict";
import test from "node:test";

import {
  grammarContentSha256,
  normalizeGrammarSnapshot,
  validateGrammarSnapshot,
} from "./toeic-grammar.canonical.js";

function question(overrides: Record<string, unknown> = {}) {
  return {
    sourceQuestionId: "q-1",
    sourceTopicId: "topic-1",
    sourceSubtopicId: "subtopic-1",
    questionNumber: 1,
    questionText: "The ideal temperature is ------- 10 and 30 degrees.",
    options: [
      { label: "A", text: "between", correct: true },
      { label: "B", text: "above", correct: false },
      { label: "C", text: "in", correct: false },
      { label: "D", text: "off", correct: false },
    ],
    explanationVi: "Between ... and ...",
    explanationEn: null,
    questionTranslation: "Nhiệt độ lý tưởng nằm từ 10 đến 30 độ.",
    answerTranslation: null,
    vocabulary: [],
    preferAiExplanation: false,
    ...overrides,
  };
}

function validFixture() {
  return {
    schemaVersion: 1,
    source: "dautoeic",
    snapshotVersion: "snapshot-1",
    inventorySha256: "a".repeat(64),
    topics: [
      {
        sourceTopicId: "topic-1",
        titleEn: "Prepositions",
        titleVi: "Giới từ",
        descriptionVi: null,
        icon: null,
        orderIndex: 1,
      },
    ],
    subtopics: [
      {
        sourceSubtopicId: "subtopic-1",
        sourceTopicId: "topic-1",
        titleEn: "Between and among",
        titleVi: "Between và among",
        descriptionVi: null,
        accessLevel: "free",
        orderIndex: 1,
      },
    ],
    questions: [question(), question()],
    sets: [
      {
        sourceSetId: "set-1",
        name: "Grammar 2026",
        year: 2026,
        accessLevel: "free",
        questionIds: ["q-1"],
      },
    ],
    difficultyLevels: [{ level: 1, questionIds: ["q-1"] }],
  };
}

test("deduplicates a question shared across grammar views", () => {
  const snapshot = normalizeGrammarSnapshot(validFixture());
  assert.equal(snapshot.questions.length, 1);
  assert.deepEqual(snapshot.sets[0]?.questionIds, ["q-1"]);
  assert.deepEqual(snapshot.difficultyLevels[0]?.questionIds, ["q-1"]);
});

test("canonical content hashing ignores input order", () => {
  const left = normalizeGrammarSnapshot(validFixture());
  const right = normalizeGrammarSnapshot({
    ...validFixture(),
    questions: [...validFixture().questions].reverse(),
  });
  assert.equal(grammarContentSha256(left), grammarContentSha256(right));
});

test("rejects invalid option and answer-key invariants", () => {
  const fixtures = [
    question({ options: question().options.slice(0, 3) }),
    question({
      options: question().options.map((option, index) =>
        index === 1 ? { ...option, label: "A" } : option
      ),
    }),
    question({
      options: question().options.map((option) => ({
        ...option,
        correct: false,
      })),
    }),
    question({
      options: question().options.map((option, index) => ({
        ...option,
        correct: index < 2,
      })),
    }),
  ];

  for (const invalid of fixtures) {
    const result = validateGrammarSnapshot({
      ...validFixture(),
      questions: [invalid],
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  }
});

test("rejects broken references and invalid difficulty levels", () => {
  const cases = [
    { ...validFixture(), subtopics: [] },
    {
      ...validFixture(),
      sets: [{ ...validFixture().sets[0], questionIds: ["missing"] }],
    },
    {
      ...validFixture(),
      difficultyLevels: [{ level: 6, questionIds: ["q-1"] }],
    },
  ];

  for (const value of cases) {
    assert.equal(validateGrammarSnapshot(value).valid, false);
  }
});

test("rejects conflicting duplicate question content", () => {
  const result = validateGrammarSnapshot({
    ...validFixture(),
    questions: [question(), question({ questionText: "Conflicting text" })],
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /conflicting duplicate/iu);
});
