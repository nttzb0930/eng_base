import assert from "node:assert/strict";
import test from "node:test";

import { normalizeGrammarSnapshot } from "./toeic-grammar.canonical.js";
import { validateStoredToeicGrammar } from "./toeic-grammar.validation.js";

test("validates local content and rejects checksum mismatches", async () => {
  const content = normalizeGrammarSnapshot({
    schemaVersion: 1, source: "dautoeic", snapshotVersion: "snapshot-1", inventorySha256: "a".repeat(64),
    topics: [], subtopics: [], questions: [], sets: [], difficultyLevels: [],
  });
  const reports: unknown[] = [];
  const summary = await validateStoredToeicGrammar({ storage: {
    async listCompleteSnapshots() { return ["snapshot-1"]; },
    async readSnapshotFile(_version: string, name: string) {
      return name === "content.json" ? content : { source: "dautoeic", snapshotVersion: "snapshot-1", inventorySha256: "a".repeat(64), contentSha256: "b".repeat(64) };
    },
    async writeSnapshotFile(_version: string, name: string, value: unknown) { assert.equal(name, "validation.json"); reports.push(value); },
  } });
  assert.equal(summary.validCount, 0);
  assert.equal(summary.invalid.length, 1);
  assert.match(JSON.stringify(reports[0]), /checksum/iu);
});
