import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260730090000_add_reading_a1/migration.sql",
);
const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");

test("Reading migration creates isolated normalized content and attempts", () => {
  const migration = readFileSync(migrationPath, "utf8");
  const schema = readFileSync(schemaPath, "utf8");

  for (const table of [
    "reading_passages",
    "reading_questions",
    "reading_options",
    "reading_attempts",
    "reading_attempt_answers",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
    assert.match(schema, new RegExp(`model ${table}`));
  }

  assert.match(migration, /reading_passages_cefr_level_check/);
  assert.match(migration, /reading_attempts_user_submission_key_key/);
  assert.match(migration, /question_prompt_snapshot/);
  assert.doesNotMatch(migration, /REFERENCES "practice_sessions"/);
  assert.doesNotMatch(migration, /REFERENCES "user_vocabulary_progress"/);
});
