import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

test("TOEIC question vocabulary cache is owned by one question", async () => {
  const apiRoot = resolve(__dirname, "../../../..");
  const [migration, schema] = await Promise.all([
    readFile(
      resolve(
        apiRoot,
        "prisma/migrations/20260801060000_add_toeic_question_vocabulary_cache/migration.sql"
      ),
      "utf8"
    ),
    readFile(resolve(apiRoot, "prisma/schema.prisma"), "utf8"),
  ]);

  assert.match(migration, /CREATE TABLE "toeic_question_vocabulary_cache"/u);
  assert.match(migration, /"question_id" INTEGER NOT NULL/u);
  assert.match(migration, /"vocabulary" JSONB NOT NULL/u);
  assert.match(migration, /PRIMARY KEY \("question_id"\)/u);
  assert.match(
    migration,
    /FOREIGN KEY \("question_id"\).*REFERENCES "toeic_questions"\("id"\).*ON DELETE CASCADE/su
  );
  assert.match(schema, /model toeic_question_vocabulary_cache \{/u);
  assert.match(
    schema,
    /toeic_question_vocabulary_cache\s+toeic_question_vocabulary_cache\?/u
  );
});
