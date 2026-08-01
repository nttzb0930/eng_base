import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260731120000_add_toeic_reading_attempts/migration.sql"
);
const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");
const partMigrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260731180000_add_toeic_reading_practice_part/migration.sql"
);

test("TOEIC Reading attempt migration preserves idempotent immutable results", () => {
  const migration = readFileSync(migrationPath, "utf8");
  const schema = readFileSync(schemaPath, "utf8");

  for (const table of [
    "toeic_reading_attempts",
    "toeic_reading_attempt_answers",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
    assert.match(schema, new RegExp(`model ${table}`));
  }

  assert.match(migration, /toeic_reading_attempts_user_submission_key_key/);
  assert.match(migration, /toeic_reading_attempts_user_submitted_idx/);
  assert.match(migration, /source_version_snapshot/);
  assert.match(migration, /question_prompt_snapshot/);
  assert.match(migration, /correct_option_text_snapshot/);
  assert.match(
    migration,
    /FOREIGN KEY \("user_id"\) REFERENCES "users"\("id"\)[\s\S]*ON DELETE CASCADE/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("test_id"\) REFERENCES "toeic_tests"\("id"\)[\s\S]*ON DELETE RESTRICT/
  );
});

test("Part practice migration adds a constrained nullable attempt scope", () => {
  assert.equal(
    existsSync(partMigrationPath),
    true,
    "Part migration must exist"
  );
  const migration = readFileSync(partMigrationPath, "utf8");
  const schema = readFileSync(schemaPath, "utf8");

  assert.match(schema, /practice_part\s+Int\?/);
  assert.match(migration, /ADD COLUMN "practice_part" INTEGER/);
  assert.match(migration, /practice_part.*IN \(5, 6, 7\)/s);
  assert.match(
    migration,
    /toeic_reading_attempts_user_practice_part_submitted_idx/
  );
});
