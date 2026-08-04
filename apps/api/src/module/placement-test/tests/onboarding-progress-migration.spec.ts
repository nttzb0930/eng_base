import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  process.cwd(),
  "prisma/migrations/20260804131500_add_onboarding_progress_fields/migration.sql"
);

test("onboarding migration aligns progress persistence with the Prisma schema", () => {
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /ALTER TABLE "user_progress"/u);
  assert.match(
    migration,
    /ADD COLUMN "languages" TEXT\[\] DEFAULT ARRAY\['en'\]::TEXT\[\]/u
  );
  assert.match(
    migration,
    /ADD COLUMN "primary_language" TEXT NOT NULL DEFAULT 'en'/u
  );
  assert.match(
    migration,
    /ADD COLUMN "goals" TEXT\[\] DEFAULT ARRAY\[\]::TEXT\[\]/u
  );
  assert.match(
    migration,
    /ADD COLUMN "intensity" TEXT NOT NULL DEFAULT 'standard'/u
  );
  assert.match(migration, /ADD COLUMN "custom_goal" TEXT/u);

  assert.match(migration, /ALTER TABLE "placement_test_sessions"/u);
  assert.match(
    migration,
    /ADD COLUMN "onboarding_step" INTEGER NOT NULL DEFAULT 1/u
  );
  assert.match(migration, /ADD COLUMN "onboarding_data" JSONB/u);
});
