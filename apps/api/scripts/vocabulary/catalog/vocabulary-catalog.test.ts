import assert from "node:assert/strict";
import test from "node:test";

import {
  assertVocabularySourcesValid,
  validateVocabularySources,
  type VocabularyCatalogItem,
  type VocabularyTopicDefinition,
} from "./vocabulary-catalog.js";

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

const item = (
  overrides: Partial<VocabularyCatalogItem> = {},
): VocabularyCatalogItem => ({
  word: "about",
  normalizedWord: "about",
  pos: "adverb",
  posVi: null,
  cefrLevel: "A1",
  meaningVi: "xung quanh",
  primaryMeaningVi: "xung quanh",
  source: "words-cefr-dictionary",
  topics: [],
  ...overrides,
});

test("catalog validation rejects an unknown topic slug", () => {
  const report = validateVocabularySources(topics, [
    item({ topics: ["missing"] }),
  ]);

  assert.deepEqual(report.errors, [
    'Vocabulary "about|adverb|a1" references unknown topic "missing"',
  ]);
});

test("catalog validation rejects duplicate vocabulary identity", () => {
  const duplicate = item({ word: "About", normalizedWord: "about" });
  const report = validateVocabularySources(topics, [duplicate, { ...duplicate }]);

  assert.equal(report.duplicateVocabularyIdentities, 1);
  assert.match(report.errors.join("\n"), /Duplicate vocabulary identity/u);
});

test("catalog validation reports unclassified items without rejecting them", () => {
  const report = validateVocabularySources(topics, [item({ topics: [] })]);

  assert.equal(report.unclassifiedItems, 1);
  assert.equal(report.classifiedItems, 0);
  assert.deepEqual(report.errors, []);
});

test("catalog validation rejects duplicate taxonomy slugs", () => {
  const report = validateVocabularySources([...topics, { ...topics[0]! }], [
    item(),
  ]);

  assert.match(report.errors.join("\n"), /Duplicate topic slug "airport"/u);
});

test("catalog validation requires complete Vietnamese topic metadata", () => {
  const report = validateVocabularySources(
    [
      {
        ...topics[0]!,
        titleVi: "",
        descriptionVi: "",
        groupVi: "",
      },
    ],
    [item()],
  );

  assert.match(
    report.errors.join("\n"),
    /Topic "airport" has empty required field "titleVi"/u,
  );
  assert.match(
    report.errors.join("\n"),
    /Topic "airport" has empty required field "descriptionVi"/u,
  );
  assert.match(
    report.errors.join("\n"),
    /Topic "airport" has empty required field "groupVi"/u,
  );
});

test("catalog validation rejects duplicate taxonomy order", () => {
  const report = validateVocabularySources(
    [
      ...topics,
      {
        ...topics[0]!,
        slug: "hotel",
        title: "Hotel",
      },
    ],
    [item()],
  );

  assert.match(report.errors.join("\n"), /Duplicate topic order 1/u);
});

test("catalog validation rejects conflicting Vietnamese group names", () => {
  const localizedTopics = [
    {
      ...topics[0]!,
      titleVi: "Sân bay",
      descriptionVi: "Từ vựng dùng tại sân bay.",
      groupVi: "Du lịch",
    },
    {
      ...topics[0]!,
      slug: "hotel",
      title: "Hotel",
      titleVi: "Khách sạn",
      descriptionVi: "Từ vựng dùng tại khách sạn.",
      order: 2,
      groupVi: "Đi lại",
    },
  ] as VocabularyTopicDefinition[];

  const report = validateVocabularySources(localizedTopics, [item()]);

  assert.match(
    report.errors.join("\n"),
    /Topic group "Travel" has conflicting Vietnamese names/u,
  );
});

test("catalog assertion throws all structural errors", () => {
  assert.throws(
    () => assertVocabularySourcesValid(topics, [item({ cefrLevel: "A0" })]),
    /invalid CEFR level "A0"/u,
  );
});
