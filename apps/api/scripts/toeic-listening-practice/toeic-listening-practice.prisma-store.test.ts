import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(
  resolve(__dirname, "toeic-listening-practice.prisma-store.ts"),
  "utf8"
);

test("Listening store augments an exact existing Reading test atomically", () => {
  assert.match(source, /source_source_test_id/u);
  assert.match(source, /source_set_id !== content\.sourceSetId/u);
  assert.doesNotMatch(source, /toeic_tests\.create\(/u);
  assert.match(source, /prisma\.\$transaction/u);
  assert.match(source, /listening_source_version/u);
  assert.match(source, /listening_status: "PUBLISHED"/u);
});

test("Listening replacement is scoped to Parts 1 through 4", () => {
  assert.match(source, /const parts = \[1, 2, 3, 4\]/u);
  assert.match(source, /part: \{ in: parts \}/u);
  assert.doesNotMatch(source, /^\s+source_version:/mu);
});
