import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260730220000_add_reading_source_candidates/migration.sql",
);

test("expands Reading CEFR and creates provenance-preserving candidates", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /cefr_level.*IN \('A1', 'A2', 'B1', 'B2'\)/su);
  assert.match(sql, /CREATE TYPE "reading_source_candidate_status"/u);
  assert.match(sql, /CREATE TABLE "reading_source_candidates"/u);
  for (const column of [
    "source",
    "source_id",
    "source_version",
    "content_sha256",
    "access_classification",
    "license_name",
    "license_reference",
    "license_intended_use",
    "approved_inventory_sha256",
    "source_level",
    "source_title",
    "source_topic",
    "source_html",
    "plain_text_draft",
    "canonical_json",
    "status",
    "rejection_reason",
    "converted_passage_id",
    "created_at",
    "updated_at",
  ]) {
    assert.match(sql, new RegExp(`"${column}"`, "u"), column);
  }
  assert.match(
    sql,
    /UNIQUE \("source", "source_id", "source_version"\)/u,
  );
  assert.match(sql, /ON DELETE SET NULL/u);
  assert.doesNotMatch(sql, /attempt|progress/iu);
});
