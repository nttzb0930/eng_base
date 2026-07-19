import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  calculateTopicDeficits,
  mergeAcceptedExpansion,
  validateExpansionArtifact,
  type TopicExpansionArtifact,
} from "./topic-expansion.js";
import {
  createTopicDeficitReport,
  formatGenerationCreated,
  formatGenerationStart,
  formatTopicDeficitReport,
  parseTopicExpansionArguments,
} from "./topic-expansion-cli.js";
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

const reportTopics: VocabularyTopicDefinition[] = [
  topics[0]!,
  {
    slug: "technology",
    title: "Technology",
    titleVi: "Công nghệ",
    description: "Technology vocabulary.",
    descriptionVi: "Từ vựng công nghệ.",
    order: 2,
    group: "Technology",
    groupVi: "Công nghệ",
  },
  {
    slug: "artificial-intelligence",
    title: "Artificial Intelligence",
    titleVi: "Trí tuệ nhân tạo",
    description: "Artificial intelligence vocabulary.",
    descriptionVi: "Từ vựng trí tuệ nhân tạo.",
    order: 3,
    group: "Technology",
    groupVi: "Công nghệ",
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
  status: TopicExpansionArtifact["status"]
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
    /must be accepted/u
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
    topics
  );

  assert.match(result.errors.join("\n"), /already exists in catalog/u);
});

test("expansion validation rejects the wrong target topic", () => {
  const invalid = artifact("accepted");
  invalid.words = [{ ...generated, topics: ["hotel"] }];

  const result = validateExpansionArtifact([], invalid, topics);

  assert.match(
    result.errors.join("\n"),
    /must reference target topic "airport"/u
  );
});

test("expansion validation requires the exact word and example counts", () => {
  const invalid = artifact("review");
  invalid.requestedCount = 2;
  invalid.words = [{ ...generated, examples: generated.examples?.slice(0, 9) }];

  const result = validateExpansionArtifact([], invalid, topics);

  assert.match(result.errors.join("\n"), /requires exactly 2 words/u);
  assert.match(
    result.errors.join("\n"),
    /requires exactly 10 bilingual examples/u
  );
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

test("Topic expansion arguments accept pnpm delimiter and JSON mode", () => {
  assert.deepEqual(parseTopicExpansionArguments(["--", "--json"]), {
    json: true,
    topicSlug: null,
  });
  assert.deepEqual(
    parseTopicExpansionArguments(["--", "transportation", "--json"]),
    { json: true, topicSlug: "transportation" }
  );
});

test("Topic expansion arguments reject unknown flags and multiple slugs", () => {
  assert.throws(
    () => parseTopicExpansionArguments(["--verbose"]),
    /Unknown Topic expansion flag "--verbose"/u
  );
  assert.throws(
    () => parseTopicExpansionArguments(["airport", "hotel"]),
    /accepts at most one Topic slug/u
  );
});

test("deficit report reconciles totals and preserves bilingual taxonomy order", () => {
  const report = createTopicDeficitReport({
    topics: reportTopics,
    deficits: [
      { slug: "airport", existingCount: 29, requestedCount: 1 },
      { slug: "technology", existingCount: 23, requestedCount: 7 },
      {
        slug: "artificial-intelligence",
        existingCount: 0,
        requestedCount: 30,
      },
    ],
    minimumWords: 30,
    catalogItems: 3000,
  });

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.totalTopics, 3);
  assert.equal(report.deficientTopics, 3);
  assert.equal(report.emptyTopics, 1);
  assert.equal(report.requestedNewWords, 38);
  assert.deepEqual(
    report.groups.map((group) => ({
      group: group.group,
      groupVi: group.groupVi,
      slugs: group.topics.map((topic) => topic.slug),
    })),
    [
      { group: "Travel", groupVi: "Du lịch", slugs: ["airport"] },
      {
        group: "Technology",
        groupVi: "Công nghệ",
        slugs: ["technology", "artificial-intelligence"],
      },
    ]
  );
  assert.equal(report.providerCalled, false);
  assert.equal(report.databaseUpdated, false);
});

test("human deficit output is readable and contains every affected Topic", () => {
  const report = createTopicDeficitReport({
    topics: reportTopics,
    deficits: calculateTopicDeficits(reportTopics, [item(1)], 30),
    minimumWords: 30,
    catalogItems: 3000,
  });
  const text = formatTopicDeficitReport(
    report,
    "data/vocabulary/working/topic-expansion/deficits.json"
  );

  assert.match(text, /Vocabulary Topic Expansion Deficits/u);
  assert.match(text, /Technology \/ Công nghệ/u);
  assert.match(text, /artificial-intelligence/u);
  assert.match(text, /Provider called\s+: no/u);
  assert.match(text, /Database updated\s+: no/u);
  assert.equal(
    formatTopicDeficitReport(report, "report.json"),
    formatTopicDeficitReport(report, "report.json")
  );
});

test("human generation messages expose bounded progress without provider data", () => {
  assert.match(
    formatGenerationStart(reportTopics[0]!, 12),
    /Generating 12 words for airport/u
  );
  assert.match(
    formatGenerationCreated(reportTopics[0]!, 12, "airport.json"),
    /Created review artifact.*airport\.json/su
  );
});

test("Topic expansion generator exposes report artifact and JSON mode", async () => {
  const source = await readFile(
    path.resolve(
      process.cwd(),
      "scripts/vocabulary/topic-expansion/generate-topic-expansion.ts"
    ),
    "utf8"
  );

  assert.match(source, /parseTopicExpansionArguments/u);
  assert.match(source, /deficits\.json/u);
  assert.match(source, /formatTopicDeficitReport/u);
  assert.doesNotMatch(
    source,
    /console\.log\(\s*JSON\.stringify\(\{\s*action:\s*"vocabulary-topic-expansion-deficits"/su
  );
});
