import assert from "node:assert/strict";
import test from "node:test";

import { auditUnclassifiedVocabulary } from "./unclassified-vocabulary-audit.js";
import type { VocabularyCatalogItem } from "../catalog/vocabulary-catalog.js";

const item = (
  word: string,
  pos: string,
  topics: string[] = []
): VocabularyCatalogItem => ({
  word,
  normalizedWord: word.toLowerCase(),
  pos,
  posVi: null,
  cefrLevel: "A1",
  meaningVi: `${word} full meaning`,
  primaryMeaningVi: `${word} meaning`,
  source: "fixture",
  topics,
});

test("audit separates unclassified vocabulary by deterministic POS rules", () => {
  const result = auditUnclassifiedVocabulary([
    item("in", " Preposition "),
    item("bank", "noun"),
    item("quickly", "adverb"),
    item("airport", "noun", ["airport"]),
  ]);

  assert.equal(result.totalCatalogRecords, 4);
  assert.equal(result.classifiedRecords, 1);
  assert.equal(result.unclassifiedRecords, 3);
  assert.deepEqual(
    result.reports["function-words"].records.map((record) => record.word),
    ["in"]
  );
  assert.deepEqual(
    result.reports["content-recovery-candidates"].records.map(
      (record) => record.word
    ),
    ["bank"]
  );
  assert.deepEqual(
    result.reports["normalization-review"].records.map((record) => record.word),
    ["quickly"]
  );
});

test("audit recognizes every approved function-word POS", () => {
  const partsOfSpeech = [
    "pronoun",
    "preposition",
    "determiner",
    "conjunction",
    "modal auxiliary",
    "be-verb",
    "do-verb",
    "have-verb",
  ];
  const result = auditUnclassifiedVocabulary(
    partsOfSpeech.map((pos, index) => item(`word-${index}`, pos))
  );

  assert.equal(result.reports["function-words"].totalRecords, 8);
  assert.equal(result.reports["content-recovery-candidates"].totalRecords, 0);
  assert.equal(result.reports["normalization-review"].totalRecords, 0);
});

test("audit preserves catalog order and emits stable reasons", () => {
  const result = auditUnclassifiedVocabulary([
    item("second", "verb"),
    item("first", "noun"),
    item("wow", "interjection"),
  ]);

  assert.deepEqual(
    result.reports["content-recovery-candidates"].records.map((record) => ({
      catalogIndex: record.catalogIndex,
      word: record.word,
      reasons: record.reasons,
    })),
    [
      {
        catalogIndex: 1,
        word: "second",
        reasons: ["content-recovery-pos:verb"],
      },
      {
        catalogIndex: 2,
        word: "first",
        reasons: ["content-recovery-pos:noun"],
      },
    ]
  );
  assert.deepEqual(result.reports["normalization-review"].records[0]?.reasons, [
    "manual-review-pos:interjection",
  ]);
});

test("audit is deterministic and does not mutate catalog input", () => {
  const catalog = [item("bank", "noun")];
  const before = structuredClone(catalog);

  const first = auditUnclassifiedVocabulary(catalog);
  const second = auditUnclassifiedVocabulary(catalog);

  assert.deepEqual(first, second);
  assert.deepEqual(catalog, before);
});
