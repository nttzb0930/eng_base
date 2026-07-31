import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const apiRoot = process.cwd();

test("Grammar attempts and progress preserve account-owned source identity", () => {
  const schema = readFileSync(join(apiRoot, "prisma/schema.prisma"), "utf8");
  const migration = readFileSync(
    join(
      apiRoot,
      "prisma/migrations/20260801080000_add_toeic_grammar_progress/migration.sql"
    ),
    "utf8"
  );

  assert.match(schema, /model grammar_question_attempts \{/u);
  assert.match(schema, /model grammar_question_progress \{/u);
  assert.match(
    schema,
    /@@unique\(\[user_id, submission_key\], map: "grammar_attempts_user_submission_key"\)/u
  );
  assert.match(
    schema,
    /@@unique\(\[user_id, source, source_question_id\], map: "grammar_progress_user_source_question_key"\)/u
  );
  assert.match(schema, /question_text_snapshot/u);
  assert.match(schema, /correct_option_text_snapshot/u);
  assert.match(schema, /practice_mode/u);
  assert.match(schema, /practice_target/u);
  assert.match(schema, /attempts_count/u);
  assert.match(schema, /correct_count/u);
  assert.match(migration, /REFERENCES "users"\("id"\) ON DELETE CASCADE/u);
  assert.match(
    migration,
    /CHECK \("practice_mode" IN \('topic', 'subtopic', 'set', 'level'\)\)/u
  );
});
