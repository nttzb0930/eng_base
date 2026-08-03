import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function readMigration(name: string): string {
  return readFileSync(
    resolve(
      __dirname,
      "../../../..",
      "prisma",
      "migrations",
      name,
      "migration.sql"
    ),
    "utf8"
  );
}

test("Writing migration enforces source and learner identity", () => {
  const sql = readMigration("20260802190000_add_toeic_writing_content");

  assert.match(sql, /UNIQUE \("source", "source_task_id"\)/u);
  assert.match(sql, /UNIQUE \("user_id", "task_id"\)/u);
  assert.match(sql, /UNIQUE \("user_id", "submission_key"\)/u);
  assert.match(sql, /CHECK \("part" IN \(1, 2\)\)/u);
  assert.match(sql, /CHECK \(char_length\("content_sha256"\) = 64\)/u);
  assert.match(sql, /CHECK \("image_bytes" > 0\)/u);
});
