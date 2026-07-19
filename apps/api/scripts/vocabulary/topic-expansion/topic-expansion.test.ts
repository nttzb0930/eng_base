import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  calculateTopicDeficits,
  dedupeTopicCandidates,
  mergeAcceptedExpansion,
  validateExpansionArtifact,
  type TopicCandidateArtifact,
  type TopicExpansionArtifact,
} from "./topic-expansion.js";
import {
  createTopicDeficitReport,
  createTopicExpansionExclusionWords,
  formatGenerationCreated,
  formatGenerationStart,
  formatTopicExpansionChunkFileName,
  formatTopicDeficitReport,
  formatTopicExpansionEvent,
  getNextTopicExpansionChunkNumber,
  createTopicExpansionQueueJobs,
  createTopicExpansionWorkerCommand,
  parseTopicCandidateGenerationArguments,
  parseTopicExpansionArguments,
  parseTopicExpansionQueueArguments,
  resolveTopicExpansionRequest,
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

const candidateArtifact = (
  candidates: TopicCandidateArtifact["candidates"]
): TopicCandidateArtifact => ({
  schemaVersion: 1,
  status: "review",
  targetTopicSlug: "airport",
  requestedCount: candidates.length,
  generatedAt: "2026-07-20T00:00:00.000Z",
  candidates,
  rejected: [],
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

test("expansion validation reports malformed AI words instead of crashing", () => {
  const invalid = artifact("review");
  invalid.requestedCount = 30;
  invalid.words = [
    ...Array.from({ length: 30 }, (_, index) => ({
      ...generated,
      word: `generated ${index}`,
      normalizedWord: `generated ${index}`,
    })),
    {
      ...generated,
      word: "missing normalized word",
      normalizedWord: undefined,
    } as unknown as VocabularyCatalogItem,
  ];

  assert.doesNotThrow(() => validateExpansionArtifact([], invalid, topics));
  const result = validateExpansionArtifact([], invalid, topics);

  assert.match(result.errors.join("\n"), /requires exactly 30 words/u);
  assert.match(
    result.errors.join("\n"),
    /Vocabulary "missing normalized word" has invalid required field "normalizedWord"/u
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
    chunks: 1,
    chunkSize: null,
  });
  assert.deepEqual(
    parseTopicExpansionArguments(["--", "transportation", "--json"]),
    { json: true, topicSlug: "transportation", chunks: 1, chunkSize: null }
  );
  assert.deepEqual(
    parseTopicExpansionArguments([
      "--",
      "artificial-intelligence",
      "--chunks",
      "10",
      "--chunk-size",
      "5",
    ]),
    {
      json: false,
      topicSlug: "artificial-intelligence",
      chunks: 10,
      chunkSize: 5,
    }
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
  assert.throws(
    () => parseTopicExpansionArguments(["airport", "--chunks", "0"]),
    /--chunks must be a positive integer/u
  );
  assert.throws(
    () => parseTopicExpansionArguments(["airport", "--chunk-size"]),
    /--chunk-size requires a value/u
  );
});

test("Topic candidate generation arguments support count and chunk size", () => {
  assert.deepEqual(
    parseTopicCandidateGenerationArguments([
      "--",
      "friends",
      "--count",
      "50",
      "--chunk-size",
      "25",
      "--json",
    ]),
    {
      json: true,
      topicSlug: "friends",
      count: 50,
      chunkSize: 25,
    }
  );
  assert.throws(
    () => parseTopicCandidateGenerationArguments(["--count", "5"]),
    /Topic slug is required/u
  );
  assert.throws(
    () => parseTopicCandidateGenerationArguments(["friends", "--count", "0"]),
    /--count must be a positive integer/u
  );
});

test("Topic candidate dedupe rejects catalog and artifact duplicates without failing", () => {
  const result = dedupeTopicCandidates(
    [
      {
        ...generated,
        normalizedWord: "dependable",
        pos: "adjective",
        cefrLevel: "B2",
      },
    ],
    [candidateArtifact([{ word: "companion", pos: "noun", cefrLevel: "B1" }])],
    candidateArtifact([
      { word: "dependable", pos: "adjective", cefrLevel: "B2" },
      { word: "Companion", pos: "noun", cefrLevel: "B1" },
      { word: "supportive", pos: "adjective", cefrLevel: "B1" },
      { word: "supportive", pos: "adjective", cefrLevel: "B1" },
    ])
  );

  assert.deepEqual(result.candidates, [
    { word: "supportive", pos: "adjective", cefrLevel: "B1" },
  ]);
  assert.deepEqual(
    result.rejected.map((candidate) => ({
      word: candidate.word,
      reason: candidate.reason,
    })),
    [
      { word: "dependable", reason: "catalog-duplicate" },
      { word: "Companion", reason: "artifact-duplicate" },
      { word: "supportive", reason: "artifact-duplicate" },
    ]
  );
});

test("Topic expansion queue arguments default to bounded conservative execution", () => {
  assert.deepEqual(parseTopicExpansionQueueArguments(["--"]), {
    json: false,
    workers: 1,
    chunksPerTopic: 10,
    chunkSize: null,
  });
  assert.deepEqual(
    parseTopicExpansionQueueArguments([
      "--",
      "--json",
      "--workers",
      "3",
      "--chunk-size",
      "5",
      "--chunks-per-topic",
      "10",
    ]),
    {
      json: true,
      workers: 3,
      chunksPerTopic: 10,
      chunkSize: 5,
    }
  );
});

test("Topic expansion queue arguments reject unsafe values", () => {
  assert.throws(
    () => parseTopicExpansionQueueArguments(["--workers", "0"]),
    /--workers must be a positive integer/u
  );
  assert.throws(
    () => parseTopicExpansionQueueArguments(["--chunks-per-topic"]),
    /--chunks-per-topic requires a value/u
  );
  assert.throws(
    () => parseTopicExpansionQueueArguments(["airport"]),
    /does not accept positional Topic slugs/u
  );
});

test("Topic expansion queue jobs cap chunks per topic and skip completed topics", () => {
  assert.deepEqual(
    createTopicExpansionQueueJobs(
      [
        {
          slug: "artificial-intelligence",
          existingCount: 0,
          requestedCount: 300,
        },
        { slug: "airport", existingCount: 298, requestedCount: 2 },
      ],
      { chunkSize: 5, chunksPerTopic: 10 }
    ),
    [
      {
        topicSlug: "artificial-intelligence",
        requestedCount: 300,
        chunks: 10,
      },
      { topicSlug: "airport", requestedCount: 2, chunks: 1 },
    ]
  );
});

test("Topic expansion worker command uses cmd on Windows for pnpm scripts", () => {
  assert.deepEqual(
    createTopicExpansionWorkerCommand({
      platform: "win32",
      topicSlug: "artificial-intelligence",
      chunks: 10,
      chunkSize: 5,
      json: true,
    }),
    {
      command: "cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        "pnpm.cmd",
        "--filter",
        "@repo/api",
        "data:generate-topic-expansion",
        "--",
        "artificial-intelligence",
        "--chunks",
        "10",
        "--chunk-size",
        "5",
        "--json",
      ],
    }
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

test("Topic expansion request chunks large deficits", () => {
  assert.deepEqual(
    resolveTopicExpansionRequest(
      {
        slug: "artificial-intelligence",
        existingCount: 0,
        requestedCount: 300,
      },
      30
    ),
    {
      totalMissingWords: 300,
      requestedWords: 30,
      chunkSize: 30,
      chunked: true,
    }
  );
  assert.deepEqual(
    resolveTopicExpansionRequest(
      { slug: "airport", existingCount: 10, requestedCount: 20 },
      30
    ),
    {
      totalMissingWords: 20,
      requestedWords: 20,
      chunkSize: 30,
      chunked: false,
    }
  );
  assert.throws(
    () =>
      resolveTopicExpansionRequest(
        { slug: "airport", existingCount: 10, requestedCount: 20 },
        0
      ),
    /chunk size must be a positive integer/u
  );
});

test("Topic expansion debug events are bounded and support JSONL", () => {
  const event = {
    event: "provider-response-received",
    topic: "airport",
    durationMs: 1234,
    generatedWords: 29,
  } as const;

  assert.equal(formatTopicExpansionEvent(event, true), JSON.stringify(event));
  assert.match(
    formatTopicExpansionEvent(event, false),
    /\[provider-response-received\] topic=airport durationMs=1234 generatedWords=29/u
  );
  assert.doesNotMatch(
    formatTopicExpansionEvent(event, false),
    /prompt|raw|key/u
  );
});

test("Topic expansion queue helpers name chunks and find the next slot", () => {
  assert.equal(formatTopicExpansionChunkFileName(1), "chunk-001.json");
  assert.equal(formatTopicExpansionChunkFileName(12), "chunk-012.json");
  assert.equal(
    getNextTopicExpansionChunkNumber([
      "chunk-001.json",
      "chunk-003.json",
      "notes.txt",
    ]),
    4
  );
});

test("Topic expansion exclusions include catalog pending and in-run words", () => {
  const pending = artifact("review");
  pending.words = [
    {
      ...generated,
      word: "pending term",
      normalizedWord: "pending term",
      pos: "noun",
    },
  ];
  const exclusions = createTopicExpansionExclusionWords({
    topicSlug: "airport",
    catalog: [
      item(1),
      { ...item(2), topics: ["hotel"] },
      { ...item(3), word: "Duplicate", normalizedWord: "duplicate" },
    ],
    pendingArtifacts: [pending],
    generatedInThisRun: [
      { ...generated, word: "In Run", normalizedWord: "in run", pos: "noun" },
      {
        ...generated,
        word: "Duplicate",
        normalizedWord: "duplicate",
        pos: "noun",
      },
    ],
  });

  assert.deepEqual(exclusions, [
    { word: "airport word 1", pos: "noun" },
    { word: "duplicate", pos: "noun" },
    { word: "pending term", pos: "noun" },
    { word: "in run", pos: "noun" },
  ]);
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
  assert.match(source, /VOCAB_AI_DEBUG/u);
  assert.match(source, /VOCAB_TOPIC_EXPANSION_CHUNK_SIZE/u);
  assert.match(source, /provider-request-start/u);
  assert.match(source, /provider-response-received/u);
  assert.match(source, /validation-start/u);
  assert.match(source, /validation-success/u);
  assert.match(source, /validation-failed/u);
  assert.match(source, /artifact-written/u);
  assert.match(source, /createTopicExpansionExclusionWords/u);
  assert.match(source, /getNextTopicExpansionChunkNumber/u);
  assert.match(source, /arguments_\.chunks/u);
  assert.match(source, /duplicateGuardCatalog/u);
  assert.doesNotMatch(
    source,
    /console\.log\(\s*JSON\.stringify\(\{\s*action:\s*"vocabulary-topic-expansion-deficits"/su
  );
});

test("Topic expansion merge exposes all accepted chunk mode", async () => {
  const source = await readFile(
    path.resolve(
      process.cwd(),
      "scripts/vocabulary/topic-expansion/merge-topic-expansion.ts"
    ),
    "utf8"
  );

  assert.match(source, /--all-accepted/u);
  assert.match(source, /chunk-\\d\{3\}\\\.json/u);
  assert.match(source, /vocabulary-topic-expansion-chunks-merged/u);
});

test("Topic expansion queue runner uses bounded workers around the single Topic runner", async () => {
  const source = await readFile(
    path.resolve(
      process.cwd(),
      "scripts/vocabulary/topic-expansion/generate-topic-expansion-queue.ts"
    ),
    "utf8"
  );

  assert.match(source, /parseTopicExpansionQueueArguments/u);
  assert.match(source, /createTopicExpansionQueueJobs/u);
  assert.match(source, /createTopicExpansionWorkerCommand/u);
  assert.match(source, /worker-start/u);
  assert.match(source, /worker-finished/u);
  assert.match(source, /spawn\(command\.command, command\.args/u);
  assert.doesNotMatch(source, /raw response|GEMINI_API_KEY|OPENAI_API_KEY/u);
});

test("Topic candidate generator writes review artifacts without provider secrets", async () => {
  const source = await readFile(
    path.resolve(
      process.cwd(),
      "scripts/vocabulary/topic-expansion/generate-topic-candidates.ts"
    ),
    "utf8"
  );

  assert.match(source, /parseTopicCandidateGenerationArguments/u);
  assert.match(source, /dedupeTopicCandidates/u);
  assert.match(source, /working\/topic-candidates/u);
  assert.match(source, /chunk-\\d\{3\}\\\.json/u);
  assert.match(source, /core vocabulary/u);
  assert.match(source, /not merely usable in a sentence/u);
  assert.match(source, /generic verbs/u);
  assert.match(source, /defend, lend, entertain/u);
  assert.doesNotMatch(source, /raw response|GEMINI_API_KEY|OPENAI_API_KEY/u);
});
