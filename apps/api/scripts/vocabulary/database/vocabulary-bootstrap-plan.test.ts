import assert from "node:assert/strict";
import test from "node:test";

import type { VocabularySeedData } from "./vocabulary-seed-data.js";
import {
  buildVocabularyBootstrapPlan,
  type VocabularyBootstrapLiveState,
  type VocabularyBootstrapPlan,
} from "./vocabulary-bootstrap-plan.js";

const sourceFixture: VocabularySeedData = {
  topics: [
    {
      slug: "travel",
      title: "Travel",
      titleVi: "Du lịch",
      description: "Travel vocabulary.",
      descriptionVi: "Từ vựng du lịch.",
      order: 1,
      group: "Everyday life",
      groupVi: "Đời sống",
    },
  ],
  catalog: [
    {
      word: "airport",
      normalizedWord: "airport",
      pos: "noun",
      posVi: "danh từ",
      cefrLevel: "A1",
      meaningVi: "sân bay",
      primaryMeaningVi: "sân bay",
      source: "fixture",
      exampleEn: "The airport is busy.",
      exampleVi: "Sân bay đông đúc.",
      exampleSource: "fixture",
      examples: [
        {
          exampleEn: "The airport is busy.",
          exampleVi: "Sân bay đông đúc.",
        },
      ],
      topics: ["travel"],
    },
    {
      word: "hotel",
      normalizedWord: "hotel",
      pos: "noun",
      posVi: "danh từ",
      cefrLevel: "A1",
      meaningVi: "khách sạn",
      primaryMeaningVi: "khách sạn",
      source: "fixture",
      topics: ["travel"],
    },
    {
      word: "ticket",
      normalizedWord: "ticket",
      pos: "noun",
      posVi: "danh từ",
      cefrLevel: "A1",
      meaningVi: "vé",
      primaryMeaningVi: "vé",
      source: "fixture",
      topics: ["travel"],
    },
    {
      word: "train",
      normalizedWord: "train",
      pos: "noun",
      posVi: "danh từ",
      cefrLevel: "A1",
      meaningVi: "tàu hỏa",
      primaryMeaningVi: "tàu hỏa",
      source: "fixture",
      topics: ["travel"],
    },
  ],
  relations: [
    { vocabularyIdentity: "airport|noun|a1", topicSlug: "travel" },
    { vocabularyIdentity: "hotel|noun|a1", topicSlug: "travel" },
    { vocabularyIdentity: "ticket|noun|a1", topicSlug: "travel" },
    { vocabularyIdentity: "train|noun|a1", topicSlug: "travel" },
  ],
};

const emptyLiveState: VocabularyBootstrapLiveState = {
  databaseTarget: "localhost:5432/eng_base?schema=public",
  vocabularyItems: [],
  examples: [],
  topics: [],
  relations: [],
  courses: [],
  units: [],
  lessons: [],
  challenges: [],
  options: [],
  protectedExternalRecords: 0,
};

function materializePlan(
  plan: VocabularyBootstrapPlan
): VocabularyBootstrapLiveState {
  let id = 1;
  return {
    databaseTarget: plan.databaseTarget,
    vocabularyItems: plan.desired.vocabularyItems.map((item) => ({
      id: id++,
      key: item.key,
      ...item.value,
    })),
    examples: plan.desired.examples.map((item) => ({
      id: id++,
      key: item.key,
      ...item.value,
    })),
    topics: plan.desired.topics.map((item) => ({
      id: id++,
      key: item.key,
      ...item.value,
    })),
    relations: plan.desired.relations.map((item) => ({
      id: id++,
      key: item.key,
      ...item.value,
    })),
    courses: plan.desired.courses.map((item) => ({
      id: id++,
      key: item.key,
      ...item.value,
    })),
    units: plan.desired.units.map((item) => ({
      id: id++,
      key: item.key,
      ...item.value,
    })),
    lessons: plan.desired.lessons.map((item) => ({
      id: id++,
      key: item.key,
      ...item.value,
    })),
    challenges: plan.desired.challenges.map((item) => ({
      id: id++,
      key: item.key,
      ...item.value,
    })),
    options: plan.desired.options.map((item) => ({
      id: id++,
      key: item.key,
      ...item.value,
    })),
    protectedExternalRecords: 0,
  };
}

test("planner creates only missing canonical and curriculum records", () => {
  const plan = buildVocabularyBootstrapPlan(sourceFixture, emptyLiveState);

  assert.equal(plan.summary.courses.create, 1);
  assert.equal(plan.summary.units.create, 4);
  assert.equal(plan.summary.vocabularyItems.create, 4);
  assert.equal(plan.summary.examples.create, 1);
  assert.equal(plan.summary.topics.create, 1);
  assert.equal(plan.summary.destructiveOperations, 0);
  assert.equal(plan.desired.challenges.length, 8);
  assert.equal(plan.desired.options.length, 32);
});

test("planner is unchanged when live state already matches desired state", () => {
  const first = buildVocabularyBootstrapPlan(sourceFixture, emptyLiveState);
  const second = buildVocabularyBootstrapPlan(
    sourceFixture,
    materializePlan(first)
  );

  assert.equal(second.summary.totals.create, 0);
  assert.equal(second.summary.totals.update, 0);
});

test("planner retains records outside canonical ownership", () => {
  const plan = buildVocabularyBootstrapPlan(sourceFixture, {
    ...emptyLiveState,
    protectedExternalRecords: 2,
  });

  assert.equal(
    plan.actions.courses.some((action) => action.key === "toeic-600"),
    false
  );
  assert.equal(plan.summary.retainedExternalRecords, 2);
});

test("planner rejects duplicate logical Units instead of guessing", () => {
  assert.throws(
    () =>
      buildVocabularyBootstrapPlan(sourceFixture, {
        ...emptyLiveState,
        units: [
          {
            id: 1,
            key: "english-vocabulary|A1",
            courseCode: "english-vocabulary",
            cefrLevel: "A1",
            title: "A1 Vocabulary",
            description: "Practice core A1 English vocabulary",
            order: 1,
          },
          {
            id: 2,
            key: "english-vocabulary|A1",
            courseCode: "english-vocabulary",
            cefrLevel: "A1",
            title: "Duplicate",
            description: "Duplicate",
            order: 9,
          },
        ],
      }),
    /ambiguous.*english-vocabulary\|A1/iu
  );
});

test("curriculum distractors and fingerprints are deterministic", () => {
  const first = buildVocabularyBootstrapPlan(sourceFixture, emptyLiveState);
  const second = buildVocabularyBootstrapPlan(sourceFixture, emptyLiveState);

  assert.equal(first.sourceSha256, second.sourceSha256);
  assert.equal(first.planSha256, second.planSha256);
  assert.deepEqual(first.desired, second.desired);
  for (const challenge of first.desired.challenges) {
    const options = first.desired.options.filter(
      (option) => option.value.challengeKey === challenge.key
    );
    assert.equal(options.length, 4);
    assert.equal(options.filter((option) => option.value.correct).length, 1);
    assert.equal(new Set(options.map((option) => option.value.text)).size, 4);
  }
});
