import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260731210000_add_toeic_reading_drafts/migration.sql"
);
const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");

test("TOEIC Reading draft migration owns secure expiring snapshots", () => {
  assert.equal(existsSync(migrationPath), true, "draft migration must exist");
  const migration = readFileSync(migrationPath, "utf8");
  const schema = readFileSync(schemaPath, "utf8");

  assert.match(migration, /CREATE TABLE "toeic_reading_drafts"/);
  assert.match(schema, /model toeic_reading_drafts/);
  assert.match(migration, /"answers" JSONB NOT NULL/);
  assert.match(migration, /"review_question_ids" INTEGER\[\] NOT NULL/);
  assert.match(migration, /"expires_at" TIMESTAMP\(6\) NOT NULL/);
  assert.match(
    migration,
    /CHECK \("scope" IN \('FULL', 'PART_5', 'PART_6', 'PART_7'\)\)/
  );
  assert.match(migration, /toeic_reading_drafts_user_test_scope_key/);
  assert.match(migration, /toeic_reading_drafts_user_updated_idx/);
  assert.match(migration, /toeic_reading_drafts_expires_idx/);
  assert.match(
    migration,
    /FOREIGN KEY \("user_id"\) REFERENCES "users"\("id"\)[\s\S]*ON DELETE CASCADE/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("test_id"\) REFERENCES "toeic_tests"\("id"\)[\s\S]*ON DELETE CASCADE/
  );
});
