import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260804130000_add_system_settings/migration.sql"
);

test("Settings migration creates the key-value store required by runtime reads", () => {
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /CREATE TABLE "system_settings"/u);
  assert.match(migration, /"key" TEXT NOT NULL/u);
  assert.match(migration, /"value" TEXT NOT NULL/u);
  assert.match(migration, /PRIMARY KEY \("key"\)/u);
});
