import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { parseToeicReadingOptions } from "./toeic-reading-practice.cli.js";

const directory = resolve(__dirname);

test("parses a bounded pilot and validates approved inventory SHA", () => {
  assert.deepEqual(
    parseToeicReadingOptions(["--set=2026", "--limit-tests=10"]),
    {
      sourceSet: "2026",
      limitTests: 10,
      approvedSha256: undefined,
      authorization: undefined,
    }
  );
  assert.throws(
    () => parseToeicReadingOptions(["--limit-tests=0"]),
    /positive integer/u
  );
  assert.throws(
    () => parseToeicReadingOptions(["--approved-sha=bad"]),
    /lowercase SHA-256/u
  );
});

test("keeps inventory, download, and validation command boundaries offline", () => {
  const inventory = readFileSync(
    resolve(directory, "inventory-toeic-reading-practice.ts"),
    "utf8"
  );
  const download = readFileSync(
    resolve(directory, "download-toeic-reading-practice.ts"),
    "utf8"
  );
  const validation = readFileSync(
    resolve(directory, "validate-toeic-reading-practice.ts"),
    "utf8"
  );
  const packageJson = readFileSync(
    resolve(directory, "../../package.json"),
    "utf8"
  );

  assert.doesNotMatch(inventory, /downloadToeicReadingPractice|Prisma/u);
  assert.doesNotMatch(download, /Prisma/u);
  assert.doesNotMatch(
    validation,
    /dautoeic-toeic-reading-source|Prisma|fetch/u
  );
  assert.doesNotMatch(
    packageJson,
    /data:(?:inventory|download|validate)-toeic-reading-practice[^"]*dotenv/u
  );
});
