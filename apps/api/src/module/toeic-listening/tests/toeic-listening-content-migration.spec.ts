import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(
  resolve(
    __dirname,
    "../../../../prisma/migrations/20260801010000_add_toeic_listening_content/migration.sql"
  ),
  "utf8"
);

test("Listening migration preserves Reading and adds independent publication metadata", () => {
  assert.match(migration, /listening_source_version/u);
  assert.match(migration, /listening_status/u);
  assert.match(migration, /listening_published_at/u);
  assert.doesNotMatch(migration, /DROP\s+COLUMN\s+"source_version"/iu);
});

test("Listening migration adds transcripts and guarded media ownership", () => {
  assert.match(migration, /transcript_translation/u);
  assert.match(migration, /CREATE TABLE "toeic_media_bindings"/u);
  assert.match(migration, /role.*IN \('AUDIO', 'IMAGE'\)/su);
  assert.match(
    migration,
    /\("question_id" IS NOT NULL\).*<>.*\("stimulus_id" IS NOT NULL\)/su
  );
  assert.match(migration, /ON DELETE CASCADE/u);
  assert.match(migration, /toeic_media_bindings_question_idx/u);
  assert.match(migration, /toeic_media_bindings_stimulus_idx/u);
});
