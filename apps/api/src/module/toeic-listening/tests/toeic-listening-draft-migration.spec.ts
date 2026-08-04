import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "prisma/migrations/20260801050000_add_toeic_listening_drafts/migration.sql"
  ),
  "utf8"
);

test("Listening drafts are account, test, and scope owned with playback state", () => {
  assert.match(migration, /CREATE TABLE "toeic_listening_drafts"/);
  assert.match(
    migration,
    /CHECK \("scope" IN \('FULL', 'PART_1', 'PART_2', 'PART_3', 'PART_4'\)\)/
  );
  assert.match(migration, /toeic_listening_drafts_user_test_scope_key/);
  assert.match(migration, /"completed_media_ids" INTEGER\[\]/);
  assert.match(migration, /"playback_position_ms" INTEGER/);
  assert.match(migration, /ON DELETE CASCADE/);
});
