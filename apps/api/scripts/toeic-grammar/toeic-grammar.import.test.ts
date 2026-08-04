import assert from "node:assert/strict";
import test from "node:test";

import { normalizeGrammarSnapshot } from "./toeic-grammar.canonical.js";
import { importToeicGrammar } from "./toeic-grammar.import.js";

const sha = "a".repeat(64);
const content = normalizeGrammarSnapshot({
  schemaVersion: 2,
  source: "dautoeic",
  snapshotVersion: sha,
  inventorySha256: sha,
  topics: [],
  subtopics: [],
  lessons: [],
  questions: [],
  sets: [],
  difficultyLevels: [],
});
const manifest = {
  source: "dautoeic",
  snapshotVersion: sha,
  inventorySha256: sha,
  contentSha256: content.contentSha256,
};

test("imports only a locally valid snapshot matching the approved SHA", async () => {
  let received: unknown;
  const result = await importToeicGrammar({
    approvedSha256: sha,
    storage: {
      async readSnapshotFile(_version: string, name: string) {
        if (name === "content.json") return content;
        if (name === "manifest.json") return manifest;
        return { valid: true, errors: [] };
      },
    },
    store: {
      async replace(value) {
        received = value;
        return "UPDATED";
      },
    },
  });
  assert.equal(result, "UPDATED");
  assert.deepEqual(received, content);
});

test("rejects invalid validation and manifest identity before store access", async () => {
  let called = false;
  await assert.rejects(
    importToeicGrammar({
      approvedSha256: sha,
      storage: {
        async readSnapshotFile(_version: string, name: string) {
          if (name === "validation.json")
            return { valid: false, errors: ["bad"] };
          return name === "content.json" ? content : manifest;
        },
      },
      store: {
        async replace() {
          called = true;
          return "UPDATED";
        },
      },
    }),
    /validation/iu
  );
  assert.equal(called, false);
});
