import assert from "node:assert/strict";
import test from "node:test";

import type { VocabularySeedData } from "./vocabulary-seed-data.js";
import type { VocabularyBootstrapLiveState } from "./vocabulary-bootstrap-plan.js";
import {
  parseBootstrapArguments,
  runVocabularyBootstrap,
  sanitizeDatabaseTarget,
  type VocabularyBootstrapRuntime,
} from "./bootstrap-vocabulary.js";

const source: VocabularySeedData = {
  topics: [],
  catalog: ["one", "two", "three", "four"].map((word, index) => ({
    word,
    normalizedWord: word,
    pos: "noun",
    posVi: "danh từ",
    cefrLevel: "A1",
    meaningVi: String(index + 1),
    primaryMeaningVi: String(index + 1),
    source: "fixture",
  })),
  relations: [],
};

const live: VocabularyBootstrapLiveState = {
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

function createRuntimeFixture() {
  const output: unknown[] = [];
  let writeCalls = 0;
  const runtime: VocabularyBootstrapRuntime = {
    async loadSource() {
      return source;
    },
    async loadLiveState() {
      return live;
    },
    async execute(plan, mode) {
      writeCalls += 1;
      return {
        mode,
        committed: mode === "apply",
        databaseTarget: plan.databaseTarget,
        sourceSha256: plan.sourceSha256,
        liveSha256: plan.liveSha256,
        planSha256: plan.planSha256,
        summary: plan.summary,
      };
    },
    print(value) {
      output.push(value);
    },
  };
  return {
    output,
    runtime,
    get writeCalls() {
      return writeCalls;
    },
  };
}

test("plan loads live state but never invokes the writer", async () => {
  const fixture = createRuntimeFixture();
  const result = await runVocabularyBootstrap(fixture.runtime, {
    mode: "plan",
    dataDirectory: "fixture",
  });

  assert.equal(result.action, "vocabulary-bootstrap-plan");
  assert.equal(fixture.writeCalls, 0);
  assert.equal(fixture.output.length, 1);
  assert.equal("desired" in result, false);
});

test("apply rejects a missing or stale confirmation before writing", async () => {
  const fixture = createRuntimeFixture();

  await assert.rejects(
    runVocabularyBootstrap(fixture.runtime, {
      mode: "apply",
      confirmation: "STALE",
      dataDirectory: "fixture",
    }),
    /confirmation/iu
  );
  assert.equal(fixture.writeCalls, 0);
});

test("dry-run invokes the transactional writer once", async () => {
  const fixture = createRuntimeFixture();
  const result = await runVocabularyBootstrap(fixture.runtime, {
    mode: "dry-run",
    dataDirectory: "fixture",
  });

  assert.equal(result.action, "vocabulary-bootstrap-dry-run");
  assert.equal(result.committed, false);
  assert.equal(fixture.writeCalls, 1);
});

test("CLI accepts only plan, dry-run, and apply", () => {
  assert.deepEqual(parseBootstrapArguments(["plan"]), { mode: "plan" });
  assert.deepEqual(
    parseBootstrapArguments([
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
    () => parseBootstrapArguments(["reset"]),
    /plan.*dry-run.*apply/iu
  );
});

test("database target excludes credentials", () => {
  assert.equal(
    sanitizeDatabaseTarget(
      "postgresql://secret-user:secret-password@db.example.test:5433/english?schema=tenant"
    ),
    "db.example.test:5433/english?schema=tenant"
  );
});
