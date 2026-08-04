import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260802090000_add_toeic_reading_practice_sessions/migration.sql"
);
const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");

test("TOEIC Reading practice persistence owns sessions and immutable answers", () => {
  assert.equal(
    existsSync(migrationPath),
    true,
    "practice-session migration must exist"
  );

  const migration = readFileSync(migrationPath, "utf8");
  const schema = readFileSync(schemaPath, "utf8");

  assert.match(schema, /model toeic_reading_practice_sessions/);
  assert.match(schema, /model toeic_reading_practice_answers/);
  assert.match(migration, /CREATE TABLE "toeic_reading_practice_sessions"/);
  assert.match(migration, /CREATE TABLE "toeic_reading_practice_answers"/);
  assert.match(migration, /"active_key" TEXT/);
  assert.match(migration, /toeic_reading_practice_sessions_active_key_key/);
  assert.match(
    migration,
    /toeic_reading_practice_answers_session_question_key/
  );
  assert.match(
    migration,
    /toeic_reading_practice_answers_session_request_key_key/
  );
  assert.match(migration, /CHECK \("part" IN \(5, 6, 7\)\)/);
  assert.match(migration, /CHECK \("status" IN \('ACTIVE', 'COMPLETED'\)\)/);
  assert.match(
    migration,
    /FOREIGN KEY \("user_id"\) REFERENCES "users"\("id"\)[\s\S]*ON DELETE CASCADE/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("test_id"\) REFERENCES "toeic_tests"\("id"\)[\s\S]*ON DELETE RESTRICT/
  );
});
