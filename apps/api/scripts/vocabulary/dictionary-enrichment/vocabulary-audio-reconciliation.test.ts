import assert from "node:assert/strict";
import test from "node:test";

import type { VocabularyCatalogItem } from "../catalog/vocabulary-catalog.js";
import {
  applyVocabularyAudioImports,
  buildVocabularyAudioReconciliationPlan,
  type VocabularyAudioDatabaseRow,
} from "./vocabulary-audio-reconciliation.js";

const databaseTarget = "localhost:5432/eng_base?schema=public";

const item = (
  normalizedWord: string,
  overrides: Partial<VocabularyCatalogItem> = {}
): VocabularyCatalogItem => ({
  word: normalizedWord,
  normalizedWord,
  pos: "noun",
  posVi: "danh từ",
  cefrLevel: "A1",
  meaningVi: `nghĩa ${normalizedWord}`,
  primaryMeaningVi: `nghĩa ${normalizedWord}`,
  source: "fixture",
  topics: ["fixture-topic"],
  ...overrides,
});

const row = (
  id: number,
  normalizedWord: string,
  overrides: Partial<VocabularyAudioDatabaseRow> = {}
): VocabularyAudioDatabaseRow => ({
  id,
  normalizedWord,
  pos: "noun",
  cefrLevel: "A1",
  audioUrl: null,
  audioSource: null,
  ...overrides,
});

test("imports only a supported database pair into an empty catalog pair", () => {
  const catalog = [
    item("apple", { phonetic: "/apple/" }),
    item("book", {
      audioUrl: "https://api.dictionaryapi.dev/media/book.mp3",
      audioSource: "free-dictionary-api",
    }),
  ];
  const databaseRows = [
    row(1, "apple", {
      audioUrl: "https://api.dictionaryapi.dev/media/apple.mp3",
      audioSource: "free-dictionary-api",
    }),
    row(2, "book", {
      audioUrl: "https://api.dictionaryapi.dev/media/book.mp3",
      audioSource: "free-dictionary-api",
    }),
  ];

  const plan = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows,
    databaseTarget,
  });
  const merged = applyVocabularyAudioImports(catalog, plan);

  assert.equal(plan.summary.import, 1);
  assert.equal(plan.summary.unchanged, 1);
  assert.equal(plan.blocked, false);
  assert.deepEqual(merged[0], {
    ...catalog[0],
    audioUrl: "https://api.dictionaryapi.dev/media/apple.mp3",
    audioSource: "free-dictionary-api",
  });
  assert.deepEqual(merged[1], catalog[1]);
  assert.equal(merged.length, catalog.length);
});

test("reports every blocking audio classification", () => {
  const catalog = [
    item("conflict", {
      audioUrl: "https://api.dictionaryapi.dev/media/catalog.mp3",
      audioSource: "free-dictionary-api",
    }),
    item("partial", {
      audioUrl: "https://api.dictionaryapi.dev/media/partial.mp3",
    }),
    item("invalid-url"),
    item("unsupported"),
    item("missing"),
  ];
  const databaseRows = [
    row(1, "conflict", {
      audioUrl: "https://api.dictionaryapi.dev/media/database.mp3",
      audioSource: "free-dictionary-api",
    }),
    row(2, "partial"),
    row(3, "invalid-url", {
      audioUrl: "http://api.dictionaryapi.dev/media/insecure.mp3",
      audioSource: "free-dictionary-api",
    }),
    row(4, "unsupported", {
      audioUrl: "https://cdn.example.test/audio.mp3",
      audioSource: "unknown-provider",
    }),
    row(5, "external"),
  ];

  const plan = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows,
    databaseTarget,
  });

  assert.equal(plan.summary.conflict, 1);
  assert.equal(plan.summary.invalidPartial, 1);
  assert.equal(plan.summary.invalidUrl, 1);
  assert.equal(plan.summary.unsupportedSource, 1);
  assert.equal(plan.summary.missingDatabaseIdentity, 1);
  assert.equal(plan.summary.externalDatabaseIdentity, 1);
  assert.equal(plan.blocked, true);
  assert.throws(
    () => applyVocabularyAudioImports(catalog, plan),
    /blocked/iu
  );
});

test("external database identities are retained without blocking", () => {
  const catalog = [item("apple")];
  const databaseRows = [row(1, "apple"), row(2, "external")];

  const plan = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows,
    databaseTarget,
  });

  assert.equal(plan.summary.unchanged, 1);
  assert.equal(plan.summary.externalDatabaseIdentity, 1);
  assert.equal(plan.blocked, false);
  assert.deepEqual(applyVocabularyAudioImports(catalog, plan), catalog);
});

test("duplicate database identity blocks reconciliation", () => {
  const catalog = [item("apple")];
  const databaseRows = [row(1, "apple"), row(2, "apple")];
  const plan = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows,
    databaseTarget,
  });

  assert.equal(plan.summary.duplicateDatabaseIdentity, 1);
  assert.equal(plan.blocked, true);
});

test("catalog-only audio is preserved", () => {
  const catalog = [
    item("apple", {
      audioUrl: "https://api.dictionaryapi.dev/media/apple.mp3",
      audioSource: "free-dictionary-api",
    }),
  ];
  const plan = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows: [row(1, "apple")],
    databaseTarget,
  });

  assert.equal(plan.summary.catalogOnly, 1);
  assert.equal(plan.blocked, false);
  assert.deepEqual(applyVocabularyAudioImports(catalog, plan), catalog);
});

test("fingerprints and confirmation are deterministic and bind live audio", () => {
  const catalog = [item("apple"), item("book")];
  const databaseRows = [
    row(2, "book"),
    row(1, "apple", {
      audioUrl: "https://api.dictionaryapi.dev/media/apple.mp3",
      audioSource: "free-dictionary-api",
    }),
  ];
  const first = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows,
    databaseTarget,
  });
  const reordered = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows: [...databaseRows].reverse(),
    databaseTarget,
  });
  const drifted = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows: databaseRows.map((databaseRow) =>
      databaseRow.id === 1
        ? {
            ...databaseRow,
            audioUrl: "https://api.dictionaryapi.dev/media/apple-uk.mp3",
          }
        : databaseRow
    ),
    databaseTarget,
  });

  assert.equal(first.planSha256, reordered.planSha256);
  assert.equal(first.confirmation, reordered.confirmation);
  assert.notEqual(first.liveSha256, drifted.liveSha256);
  assert.notEqual(first.confirmation, drifted.confirmation);
});

test("apply rejects a catalog that drifted after planning", () => {
  const catalog = [item("apple")];
  const plan = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows: [
      row(1, "apple", {
        audioUrl: "https://api.dictionaryapi.dev/media/apple.mp3",
        audioSource: "free-dictionary-api",
      }),
    ],
    databaseTarget,
  });

  assert.throws(
    () =>
      applyVocabularyAudioImports(
        [item("apple", { meaningVi: "catalog đã thay đổi" })],
        plan
      ),
    /catalog.*drift/iu
  );
});
