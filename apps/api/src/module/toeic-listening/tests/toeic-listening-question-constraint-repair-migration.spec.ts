import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  __dirname,
  "../../../../prisma/migrations/20260801030000_allow_toeic_listening_questions/migration.sql"
);

test("repair migration permits Listening question parts and numbers", () => {
  assert.equal(
    existsSync(migrationPath),
    true,
    "Listening question constraint repair migration must exist"
  );
  const migration = readFileSync(migrationPath, "utf8");
  assert.match(migration, /DROP CONSTRAINT "toeic_questions_part_check"/u);
  assert.match(migration, /DROP CONSTRAINT "toeic_questions_number_check"/u);
  assert.match(
    migration,
    /"part"\s+IN\s+\(1,\s*2,\s*3,\s*4,\s*5,\s*6,\s*7\)/iu
  );
  assert.match(migration, /"number"\s+BETWEEN\s+1\s+AND\s+200/iu);
});
