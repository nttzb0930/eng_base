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

test("Writing submission migration snapshots historical comparison material", () => {
  const sql = readMigration(
    "20260803113000_snapshot_toeic_writing_submissions"
  );

  assert.match(sql, /ADD COLUMN "task_title" TEXT/u);
  assert.match(sql, /ADD COLUMN "task_part" INTEGER/u);
  assert.match(sql, /ADD COLUMN "reference_snapshot" JSONB/u);
  assert.match(sql, /UPDATE "toeic_writing_submissions"/u);
  assert.match(sql, /"reference_snapshot" SET NOT NULL/u);
  assert.match(sql, /CHECK \("task_part" IN \(1, 2\)\)/u);
});
