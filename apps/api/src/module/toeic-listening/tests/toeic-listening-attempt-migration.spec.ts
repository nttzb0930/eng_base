import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "prisma/migrations/20260801040000_add_toeic_listening_attempts/migration.sql"
  ),
  "utf8"
);

test("Listening attempts preserve immutable results and restrict test deletion", () => {
  assert.match(migration, /CREATE TABLE "toeic_listening_attempts"/);
  assert.match(migration, /CREATE TABLE "toeic_listening_attempt_answers"/);
  assert.match(migration, /toeic_listening_attempts_user_submission_key_key/);
  assert.match(
    migration,
    /toeic_listening_attempts_user_practice_part_submitted_idx/
  );
  assert.match(migration, /FOREIGN KEY \("test_id"\)[\s\S]*ON DELETE RESTRICT/);
  assert.match(migration, /transcript_snapshot/);
  assert.match(migration, /stimulus_snapshot/);
  assert.match(migration, /question_media_snapshot/);
  assert.match(migration, /question_number_snapshot" BETWEEN 1 AND 100/);
  assert.match(migration, /part_snapshot" IN \(1, 2, 3, 4\)/);
});
