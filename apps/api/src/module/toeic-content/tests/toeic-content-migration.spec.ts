import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260731040000_add_toeic_reading_content/migration.sql"
);

test("creates the Course-owned TOEIC Reading aggregate", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /CREATE TYPE "toeic_publication_status"/u);
  for (const table of [
    "toeic_test_sets",
    "toeic_tests",
    "toeic_stimuli",
    "toeic_questions",
    "toeic_question_options",
    "toeic_media_assets",
  ]) {
    assert.match(sql, new RegExp('CREATE TABLE "' + table + '"', "u"));
  }
  assert.match(
    sql,
    /CREATE UNIQUE INDEX "toeic_tests_source_test_id_key".*ON "toeic_tests"\("source", "source_test_id"\)/su
  );
  assert.match(sql, /FOREIGN KEY \("course_id"\).*"courses"/su);
  assert.match(sql, /CHECK \("part" IN \(5, 6, 7\)\)/u);
  assert.doesNotMatch(sql, /toeic_(attempts|scores|progress)/iu);
});
