import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  __dirname,
  "../../../../prisma/migrations/20260801020000_allow_toeic_listening_stimuli/migration.sql"
);

test("repair migration permits Listening stimulus parts and audio kind", () => {
  assert.equal(
    existsSync(migrationPath),
    true,
    "Listening stimulus constraint repair migration must exist"
  );
  const migration = readFileSync(migrationPath, "utf8");
  assert.match(
    migration,
    /"part"\s+IN\s+\(1,\s*2,\s*3,\s*4,\s*5,\s*6,\s*7\)/iu
  );
  assert.match(
    migration,
    /"kind"\s+IN\s+\('text',\s*'image',\s*'audio',\s*'mixed'\)/iu
  );
  assert.match(migration, /DROP CONSTRAINT "toeic_stimuli_part_check"/u);
  assert.match(migration, /DROP CONSTRAINT "toeic_stimuli_kind_check"/u);
});
