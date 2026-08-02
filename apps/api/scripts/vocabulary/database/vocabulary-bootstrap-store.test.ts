import assert from "node:assert/strict";
import test from "node:test";

import type { VocabularySeedData } from "./vocabulary-seed-data.js";
import {
  buildVocabularyBootstrapPlan,
  type VocabularyBootstrapLiveState,
} from "./vocabulary-bootstrap-plan.js";
import {
  executeVocabularyBootstrap,
  type VocabularyBootstrapStoreDependencies,
} from "./vocabulary-bootstrap-store.js";

const source: VocabularySeedData = {
  topics: [],
  catalog: [
    {
      word: "one",
      normalizedWord: "one",
      pos: "noun",
      posVi: "danh từ",
      cefrLevel: "A1",
      meaningVi: "một",
      primaryMeaningVi: "một",
      source: "fixture",
    },
    {
      word: "two",
      normalizedWord: "two",
      pos: "noun",
      posVi: "danh từ",
      cefrLevel: "A1",
      meaningVi: "hai",
      primaryMeaningVi: "hai",
      source: "fixture",
    },
    {
      word: "three",
      normalizedWord: "three",
      pos: "noun",
      posVi: "danh từ",
      cefrLevel: "A1",
      meaningVi: "ba",
      primaryMeaningVi: "ba",
      source: "fixture",
    },
    {
      word: "four",
      normalizedWord: "four",
      pos: "noun",
      posVi: "danh từ",
      cefrLevel: "A1",
      meaningVi: "bốn",
      primaryMeaningVi: "bốn",
      source: "fixture",
    },
  ],
  relations: [],
};

const emptyLiveState: VocabularyBootstrapLiveState = {
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
  protectedExternalRecords: 3,
};

function createTransactionClient() {
  const calls: string[] = [];
  const client = {
    async $transaction<T>(callback: (transaction: object) => Promise<T>) {
      calls.push("transaction-start");
      try {
        const result = await callback({});
        calls.push("transaction-commit");
        return result;
      } catch (error) {
        calls.push("transaction-rollback");
        throw error;
      }
    },
  };
  return { calls, client };
}

test("dry-run executes the writer and returns a rolled-back report", async () => {
  const plan = buildVocabularyBootstrapPlan(source, emptyLiveState);
  const fake = createTransactionClient();
  const dependencyCalls: string[] = [];
  const dependencies: VocabularyBootstrapStoreDependencies = {
    async acquireLock() {
      dependencyCalls.push("lock");
    },
    async loadLiveState() {
      dependencyCalls.push("load");
      return emptyLiveState;
    },
    async applyPlan() {
      dependencyCalls.push("write-plan");
      return plan.summary;
    },
  };

  const report = await executeVocabularyBootstrap(
    fake.client,
    plan,
    "dry-run",
    dependencies
  );

  assert.equal(report.committed, false);
  assert.deepEqual(fake.calls, ["transaction-start", "transaction-rollback"]);
  assert.deepEqual(dependencyCalls, ["lock", "load", "write-plan"]);
});

test("apply refuses live drift before the first mutation", async () => {
  const plan = buildVocabularyBootstrapPlan(source, emptyLiveState);
  const fake = createTransactionClient();
  let writeCalls = 0;
  const dependencies: VocabularyBootstrapStoreDependencies = {
    async acquireLock() {},
    async loadLiveState() {
      return { ...emptyLiveState, protectedExternalRecords: 4 };
    },
    async applyPlan() {
      writeCalls += 1;
      return plan.summary;
    },
  };

  await assert.rejects(
    executeVocabularyBootstrap(fake.client, plan, "apply", dependencies),
    /live database changed/iu
  );
  assert.equal(writeCalls, 0);
  assert.deepEqual(fake.calls, ["transaction-start", "transaction-rollback"]);
});
