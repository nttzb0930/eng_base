import assert from "node:assert/strict";
import test from "node:test";

import {
  createClassificationExecutionIdentity,
  type ClassificationProvider,
} from "./topic-classification-run.js";
import { createClassificationPlan } from "./topic-classification.js";
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

const catalog: VocabularyCatalogItem[] = ["airport", "hotel"].map((word) => ({
  word,
  normalizedWord: word,
  pos: "noun",
  posVi: "danh từ",
  cefrLevel: "A1",
  meaningVi: word,
  primaryMeaningVi: word,
  source: "fixture",
  topics: [],
}));

const plan = createClassificationPlan(catalog, 1, {
  topics,
  prompt: "Classify every record.",
});

type MergeModule = {
  collectClassificationOutputs?: (input: {
    plan: typeof plan;
    artifacts: unknown[];
    rejectedBatchIds: ReadonlySet<string>;
    topicSlugs: ReadonlySet<string>;
  }) => {
    outputs: Array<{ batchId: string; records: Array<{ id: number; topics: string[] }> }>;
    errors: string[];
  };
};

async function loadMergeModule() {
  return import("./topic-classification-merge.js")
    .then((module) => module as MergeModule)
    .catch(() => ({} as MergeModule));
}

const artifact = (
  batchIndex: number,
  provider: ClassificationProvider = "openai-compatible",
  model = "gemini-3-flash",
) => {
  const batch = plan.batches[batchIndex]!;
  return {
    ...createClassificationExecutionIdentity({ plan, batch, provider, model }),
    records: [{ id: batch.records[0]!.id, topics: ["airport"] }],
  };
};

test("merge collection returns valid artifacts in manifest order", async () => {
  const { collectClassificationOutputs } = await loadMergeModule();
  assert.equal(typeof collectClassificationOutputs, "function");
  if (!collectClassificationOutputs) return;

  const result = collectClassificationOutputs({
    plan,
    artifacts: [artifact(1), artifact(0)],
    rejectedBatchIds: new Set(),
    topicSlugs: new Set(["airport"]),
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.outputs.map((output) => output.batchId),
    ["batch-001", "batch-002"],
  );
});

test("merge collection rejects legacy missing and rejected batches", async () => {
  const { collectClassificationOutputs } = await loadMergeModule();
  assert.equal(typeof collectClassificationOutputs, "function");
  if (!collectClassificationOutputs) return;

  const result = collectClassificationOutputs({
    plan,
    artifacts: [
      {
        batchId: "batch-001",
        records: [{ id: 1, topics: ["airport"] }],
      },
    ],
    rejectedBatchIds: new Set(["batch-002"]),
    topicSlugs: new Set(["airport"]),
  });
  const errors = result.errors.join("\n");

  assert.match(errors, /batch-001.*schema-version-mismatch/iu);
  assert.match(errors, /Rejected batch id batch-002/u);
  assert.match(errors, /Missing batch id batch-002/u);
});

test("merge collection rejects stale and mixed execution identities", async () => {
  const { collectClassificationOutputs } = await loadMergeModule();
  assert.equal(typeof collectClassificationOutputs, "function");
  if (!collectClassificationOutputs) return;

  const stale = { ...artifact(0), inputSha256: "stale" };
  const mixedProvider = artifact(1, "gemini");
  const result = collectClassificationOutputs({
    plan,
    artifacts: [stale, mixedProvider],
    rejectedBatchIds: new Set(),
    topicSlugs: new Set(["airport"]),
  });
  const errors = result.errors.join("\n");

  assert.match(errors, /batch-001.*input-sha256-mismatch/iu);
  assert.match(errors, /Mixed classification providers or models/u);
});
