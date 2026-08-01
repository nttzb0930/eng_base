import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  loadToeicListeningRuntime,
  parseToeicListeningOptions,
} from "./toeic-listening-practice.cli";

test("requires a lowercase approved Reading inventory SHA", () => {
  assert.deepEqual(
    parseToeicListeningOptions([`--reading-inventory-sha=${"a".repeat(64)}`]),
    {
      readingInventorySha256: "a".repeat(64),
      approvedSha256: undefined,
      authorization: undefined,
    }
  );
  assert.throws(
    () =>
      loadToeicListeningRuntime({
        argv: [],
        requireReadingInventorySha: true,
        requireApprovedSha: false,
      }),
    /--reading-inventory-sha is required/u
  );
  assert.throws(
    () => parseToeicListeningOptions(["--reading-inventory-sha=not-a-sha"]),
    /lowercase SHA-256/u
  );
});

test("inventory command remains database and download free", () => {
  const source = readFileSync(
    resolve(__dirname, "inventory-toeic-listening-practice.ts"),
    "utf8"
  );
  assert.doesNotMatch(source, /Prisma|downloadToeic|dotenv/u);
});
