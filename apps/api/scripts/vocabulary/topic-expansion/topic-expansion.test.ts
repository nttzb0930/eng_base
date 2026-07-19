import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateTopicDeficits,
  mergeAcceptedExpansion,
  validateExpansionArtifact,
  type TopicExpansionArtifact,
} from "./topic-expansion.js";
import type {
  VocabularyCatalogItem,
  VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";

const topics: VocabularyTopicDefinition[] = [
  {
    slug: "airport",
    title: "Airport",
    titleVi: "Sân bay",
    description: "Airport vocabulary.",
    descriptionVi: "Từ vựng dùng tại sân bay.",
    order: 1,
    group: "Travel",
    groupVi: "Du lịch",
  },
];

const item = (index: number): VocabularyCatalogItem => ({
  word: `Airport word ${index}`,
  normalizedWord: `airport word ${index}`,
  pos: "noun",
  posVi: "danh từ",
  cefrLevel: "A1",
  meaningVi: `nghĩa ${index}`,
  primaryMeaningVi: `nghĩa ${index}`,
  source: "fixture",
  topics: ["airport"],
});

const generated: VocabularyCatalogItem = {
  word: "airbridge",
  normalizedWord: "airbridge",
  pos: "noun",
  posVi: "danh từ",
  cefrLevel: "B1",
  meaningVi: "cầu dẫn khách lên máy bay",
  primaryMeaningVi: "cầu dẫn khách",
  source: "ai-topic-expansion",
  exampleEn: "Passengers crossed the airbridge.",
  exampleVi: "Hành khách đi qua cầu dẫn khách.",
  exampleSource: "ai-topic-expansion",
  examples: [
    {
      exampleEn: "Passengers crossed the airbridge.",
      exampleVi: "Hành khách đi qua cầu dẫn khách.",
    },
    ...Array.from({ length: 9 }, (_, index) => ({
      exampleEn: `Airport example ${index + 2}.`,
      exampleVi: `Ví dụ sân bay ${index + 2}.`,
    })),
  ],
  dictionaryLookupCompleted: false,
  topics: ["airport"],
};

const artifact = (
  status: TopicExpansionArtifact["status"],
): TopicExpansionArtifact => ({
  schemaVersion: 1,
  status,
  targetTopicSlug: "airport",
  requestedCount: 1,
  examplesPerWord: 10,
  generatedAt: "2026-07-18T00:00:00.000Z",
  words: [generated],
});

test("topic deficits request only the number of missing words", () => {
  const catalog = Array.from({ length: 18 }, (_, index) => item(index));

  assert.deepEqual(calculateTopicDeficits(topics, catalog, 30), [
    { slug: "airport", existingCount: 18, requestedCount: 12 },
  ]);
});

test("review expansion cannot merge", () => {
  assert.throws(
    () => mergeAcceptedExpansion([], artifact("review"), topics),
    /must be accepted/u,
  );
});

test("accepted AI words retain provenance and await dictionary lookup", () => {
  const merged = mergeAcceptedExpansion([], artifact("accepted"), topics);

  assert.equal(merged.at(-1)?.source, "ai-topic-expansion");
  assert.equal(merged.at(-1)?.exampleSource, "ai-topic-expansion");
  assert.equal(merged.at(-1)?.dictionaryLookupCompleted, false);
});

test("expansion validation rejects existing vocabulary identities", () => {
  const result = validateExpansionArtifact(
    [generated],
    artifact("accepted"),
    topics,
  );

  assert.match(result.errors.join("\n"), /already exists in catalog/u);
});

test("expansion validation rejects the wrong target topic", () => {
  const invalid = artifact("accepted");
  invalid.words = [{ ...generated, topics: ["hotel"] }];

  const result = validateExpansionArtifact([], invalid, topics);

  assert.match(result.errors.join("\n"), /must reference target topic "airport"/u);
});

test("expansion validation requires the exact word and example counts", () => {
  const invalid = artifact("review");
  invalid.requestedCount = 2;
  invalid.words = [{ ...generated, examples: generated.examples?.slice(0, 9) }];

  const result = validateExpansionArtifact([], invalid, topics);

  assert.match(result.errors.join("\n"), /requires exactly 2 words/u);
  assert.match(result.errors.join("\n"), /requires exactly 10 bilingual examples/u);
});

test("expansion validation requires distinct examples and matching primary example", () => {
  const invalid = artifact("review");
  const repeated = {
    exampleEn: generated.exampleEn!,
    exampleVi: generated.exampleVi!,
  };
  invalid.words = [
    {
      ...generated,
      exampleEn: "A different primary example.",
      examples: Array.from({ length: 10 }, () => repeated),
    },
  ];

  const result = validateExpansionArtifact([], invalid, topics);

  assert.match(result.errors.join("\n"), /first bilingual example/u);
  assert.match(result.errors.join("\n"), /distinct bilingual examples/u);
});
