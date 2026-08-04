import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migrationPath =
  "prisma/migrations/20260803140000_add_toeic_writing_ai/migration.sql";
const repositorySource = readFileSync(
  "src/module/toeic-writing/repository/prisma-writing-ai.repository.ts",
  "utf8"
);

test("Prisma owns Writing AI context, grade, assistance, and quota models", () => {
  for (const model of [
    "toeic_writing_image_contexts",
    "toeic_writing_ai_grades",
    "toeic_writing_assistance_events",
    "ai_usage_daily",
    "ai_usage_reservations",
  ]) {
    assert.match(schema, new RegExp(`model ${model} \\{`, "u"));
  }
  assert.match(schema, /@@unique\(\[task_id, image_sha256, prompt_version\]/u);
  assert.match(
    schema,
    /@@unique\(\[user_id, task_id, content_version, response_hash, prompt_version\]/u
  );
  assert.match(schema, /@@unique\(\[user_id, idempotency_key\]/u);
  assert.match(schema, /@@unique\(\[user_id, feature, usage_date\]/u);
});

test("migration enforces atomic quota and ownership constraints", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /CHECK \("reserved" >= 0\)/u);
  assert.match(sql, /CHECK \("used" >= 0\)/u);
  assert.match(
    sql,
    /CHECK \("status" IN \('RESERVED', 'COMPLETED', 'RELEASED'\)\)/u
  );
  assert.match(
    sql,
    /CREATE UNIQUE INDEX "ai_usage_reservations_one_active_writing_per_user"[\s\S]*WHERE "status" = 'RESERVED' AND "feature" = 'TOEIC_WRITING'/u
  );
  assert.match(sql, /"toeic_writing_ai_grades_user_created_idx"/u);
  assert.match(sql, /ON DELETE CASCADE/u);
  assert.match(sql, /ON DELETE RESTRICT/u);
});

test("quota SQL compares user ids using the database text type", () => {
  assert.doesNotMatch(repositorySource, /\$\{input\.userId\}::uuid/u);
});
