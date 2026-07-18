import assert from "node:assert/strict";
import test from "node:test";

import {
  createClassificationPlan,
  mergeClassifications,
  validateClassificationResults,
  type ClassificationOutput,
} from "./topic-classification.js";
import type { VocabularyCatalogItem } from "./vocabulary-catalog.js";

const item = (word: string): VocabularyCatalogItem => ({
  word,
  normalizedWord: word.toLowerCase(),
  pos: "noun",
  posVi: "danh từ",
  cefrLevel: "A1",
  meaningVi: `${word} meaning`,
  primaryMeaningVi: `${word} meaning`,
  source: "fixture",
  topics: [],
});

const catalog = [item("Airport"), item("Hotel"), item("Passport")];

test("classification batches keep stable one-based record IDs", () => {
  const plan = createClassificationPlan(catalog, 2);

  assert.deepEqual(
    plan.batches.map((batch) => batch.records.map((record) => record.id)),
    [[1, 2], [3]],
  );
  assert.deepEqual(
    plan.batches.map((batch) => batch.batchId),
    ["batch-001", "batch-002"],
  );
});

test("classification planning is deterministic", () => {
  assert.deepEqual(
    createClassificationPlan(catalog, 2),
    createClassificationPlan(catalog, 2),
  );
});

test("classification validation rejects duplicated and unknown record IDs", () => {
  const plan = createClassificationPlan(catalog, 2);
  const outputs: ClassificationOutput[] = [
    {
      batchId: "batch-001",
      records: [
        { id: 1, topics: ["airport"] },
        { id: 1, topics: ["airport"] },
        { id: 99, topics: ["airport"] },
      ],
    },
    { batchId: "batch-002", records: [{ id: 3, topics: [] }] },
  ];

  const result = validateClassificationResults(
    plan,
    outputs,
    new Set(["airport"]),
  );

  assert.match(result.errors.join("\n"), /Duplicate record id 1/u);
  assert.match(result.errors.join("\n"), /Unknown record id 99/u);
  assert.match(result.errors.join("\n"), /Missing record id 2/u);
});

test("classification validation rejects unknown and multiple topics", () => {
  const plan = createClassificationPlan([catalog[0]!], 50);
  const result = validateClassificationResults(
    plan,
    [
      {
        batchId: "batch-001",
        records: [{ id: 1, topics: ["airport", "missing"] }],
      },
    ],
    new Set(["airport"]),
  );

  assert.match(result.errors.join("\n"), /at most one topic/u);
  assert.match(result.errors.join("\n"), /Unknown topic slug "missing"/u);
});

test("classification merge changes only topics without mutating input", () => {
  const source = [catalog[0]!];
  const merged = mergeClassifications(source, [
    { id: 1, topics: ["airport"] },
  ]);

  assert.deepEqual(merged[0], { ...source[0], topics: ["airport"] });
  assert.deepEqual(source[0]?.topics, []);
});
