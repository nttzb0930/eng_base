import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const here = dirname(__filename);
const apiRoot = resolve(here, "../../../../");
const schemaPath = resolve(apiRoot, "prisma/schema.prisma");
const migrationPath = resolve(
  apiRoot,
  "prisma/migrations/20260801100000_add_toeic_dictation_content/migration.sql",
);

test("dictation Prisma schema exposes content, progress, and attempt models", async () => {
  const schema = await readFile(schemaPath, "utf8");

  for (const model of [
    "model toeic_dictation_sets",
    "model toeic_dictation_items",
    "model toeic_dictation_progress",
    "model toeic_dictation_attempts",
  ]) {
    assert.match(schema, new RegExp(`^${model} \\{`, "m"));
  }

  assert.match(schema, /@@unique\(\[source, source_set_id\]/u);
  assert.match(schema, /@@unique\(\[user_id, item_id\]/u);
  assert.match(schema, /@@unique\(\[user_id, submission_key\]/u);
  assert.match(schema, /mastered\s+Boolean\s+@default\(false\)/u);
});

test("dictation migration creates safe score constraints and ownership keys", async () => {
  const migration = await readFile(migrationPath, "utf8");

  for (const table of [
    'CREATE TABLE "toeic_dictation_sets"',
    'CREATE TABLE "toeic_dictation_items"',
    'CREATE TABLE "toeic_dictation_progress"',
    'CREATE TABLE "toeic_dictation_attempts"',
  ]) {
    assert.match(migration, new RegExp(table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(migration, /accuracy.*BETWEEN 0 AND 100/su);
  assert.match(migration, /toeic_dictation_progress_user_item_key/u);
  assert.match(migration, /toeic_dictation_attempts_user_submission_key/u);
  assert.match(migration, /toeic_dictation_attempts_item_id_fkey/u);
});
