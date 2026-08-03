import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type {
  VocabularyCatalogItem,
  VocabularyTopicDefinition,
} from "../catalog/vocabulary-catalog.js";
import {
  applyVocabularyAudioImports,
  buildVocabularyAudioReconciliationPlan,
  type VocabularyAudioDatabaseRow,
} from "./vocabulary-audio-reconciliation.js";
import {
  parseVocabularyAudioReconciliationArguments,
  runVocabularyAudioReconciliation,
  sanitizeAudioReconciliationDatabaseTarget,
  writeReconciledVocabularyCatalog,
  type VocabularyAudioReconciliationRuntime,
} from "./reconcile-vocabulary-audio.js";

const databaseTarget = "localhost:5432/eng_base?schema=public";

const topic: VocabularyTopicDefinition = {
  slug: "fixture-topic",
  title: "Fixture",
  titleVi: "Dữ liệu kiểm thử",
  description: "Fixture topic",
  descriptionVi: "Chủ đề kiểm thử",
  order: 1,
  group: "Fixtures",
  groupVi: "Kiểm thử",
};

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
  topics: [topic.slug],
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

const catalog = [item("apple")];
const databaseRows = [
  row(1, "apple", {
    audioUrl: "https://api.dictionaryapi.dev/media/apple.mp3",
    audioSource: "free-dictionary-api",
  }),
];

const createRuntime = (
  overrides: Partial<VocabularyAudioReconciliationRuntime> = {}
) => {
  const output: unknown[] = [];
  let reportWrites = 0;
  let catalogWrites = 0;
  const runtime: VocabularyAudioReconciliationRuntime = {
    databaseTarget,
    async loadSources() {
      return { catalog, topics: [topic] };
    },
    async loadDatabaseRows() {
      return databaseRows;
    },
    async writeReport() {
      reportWrites += 1;
      return "fixture/audio-reconciliation-plan.json";
    },
    async writeCatalog() {
      catalogWrites += 1;
      return { backupPath: "fixture/catalog-backup.json" };
    },
    print(value) {
      output.push(value);
    },
    ...overrides,
  };
  return {
    output,
    runtime,
    get reportWrites() {
      return reportWrites;
    },
    get catalogWrites() {
      return catalogWrites;
    },
  };
};

test("plan writes a report but never invokes the catalog writer", async () => {
  const fixture = createRuntime();

  const result = await runVocabularyAudioReconciliation(fixture.runtime, {
    mode: "plan",
    dataDirectory: "fixture",
  });

  assert.equal(result.action, "vocabulary-audio-reconciliation-plan");
  assert.equal(result.committed, false);
  assert.equal(result.summary.import, 1);
  assert.equal(fixture.reportWrites, 1);
  assert.equal(fixture.catalogWrites, 0);
  assert.equal(fixture.output.length, 1);
});

test("apply rejects stale confirmation before catalog write", async () => {
  const fixture = createRuntime();

  await assert.rejects(
    runVocabularyAudioReconciliation(fixture.runtime, {
      mode: "apply",
      confirmation: "STALE",
      dataDirectory: "fixture",
    }),
    /confirmation/iu
  );

  assert.equal(fixture.reportWrites, 1);
  assert.equal(fixture.catalogWrites, 0);
});

test("apply writes the catalog once for the current confirmation", async () => {
  const fixture = createRuntime();
  const planned = await runVocabularyAudioReconciliation(fixture.runtime, {
    mode: "plan",
    dataDirectory: "fixture",
  });

  const result = await runVocabularyAudioReconciliation(fixture.runtime, {
    mode: "apply",
    confirmation: planned.confirmation,
    dataDirectory: "fixture",
  });

  assert.equal(result.action, "vocabulary-audio-reconciliation-apply");
  assert.equal(result.committed, true);
  assert.equal(result.backupPath, "fixture/catalog-backup.json");
  assert.equal(fixture.catalogWrites, 1);
});

test("CLI accepts exactly plan or confirmed apply", () => {
  assert.deepEqual(parseVocabularyAudioReconciliationArguments(["plan"]), {
    mode: "plan",
  });
  assert.deepEqual(
    parseVocabularyAudioReconciliationArguments([
      "--",
      "apply",
      "--confirm",
      "TOKEN",
      "--data-dir",
      "C:/canonical",
    ]),
    {
      mode: "apply",
      confirmation: "TOKEN",
      dataDirectory: "C:/canonical",
    }
  );
  assert.throws(
    () => parseVocabularyAudioReconciliationArguments(["dry-run"]),
    /plan.*apply/iu
  );
  assert.throws(
    () =>
      parseVocabularyAudioReconciliationArguments(["apply", "--confirm"]),
    /requires a value/iu
  );
});

test("database target excludes connection credentials", () => {
  assert.equal(
    sanitizeAudioReconciliationDatabaseTarget(
      "postgresql://secret-user:secret-password@db.example.test:5433/english?schema=tenant"
    ),
    "db.example.test:5433/english?schema=tenant"
  );
});

test("catalog writer creates a backup and atomically changes only audio fields", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "audio-reconcile-"));
  const plan = buildVocabularyAudioReconciliationPlan({
    catalog,
    databaseRows,
    databaseTarget,
  });
  const merged = applyVocabularyAudioImports(catalog, plan);
  await writeFile(
    path.join(directory, "vocabulary-catalog.json"),
    `${JSON.stringify(catalog, null, 2)}\n`,
    "utf8"
  );

  const result = await writeReconciledVocabularyCatalog({
    dataDirectory: directory,
    catalog,
    merged,
    topics: [topic],
    now: new Date("2026-08-03T04:05:06.000Z"),
  });

  assert.match(
    result.backupPath,
    /vocabulary-catalog\.before-audio-reconciliation/iu
  );
  assert.deepEqual(
    JSON.parse(
      await readFile(
        path.join(directory, "vocabulary-catalog.json"),
        "utf8"
      )
    ),
    merged
  );
  assert.deepEqual(
    JSON.parse(await readFile(result.backupPath, "utf8")),
    catalog
  );
});

test("catalog writer rejects identity drift before creating a backup", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "audio-reconcile-"));
  await writeFile(
    path.join(directory, "vocabulary-catalog.json"),
    `${JSON.stringify(catalog, null, 2)}\n`,
    "utf8"
  );

  await assert.rejects(
    writeReconciledVocabularyCatalog({
      dataDirectory: directory,
      catalog,
      merged: [item("book")],
      topics: [topic],
      now: new Date("2026-08-03T04:05:06.000Z"),
    }),
    /identity sequence/iu
  );
});
