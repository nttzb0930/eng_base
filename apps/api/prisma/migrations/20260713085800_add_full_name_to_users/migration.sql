-- Migration: Add full_name (required) to users table
-- Strategy: Add as nullable first → backfill with username → set NOT NULL

-- Step 1: Add column as nullable
ALTER TABLE "users" ADD COLUMN "full_name" TEXT;

-- Step 2: Backfill existing rows with their username as placeholder
UPDATE "users" SET "full_name" = username WHERE "full_name" IS NULL;

-- Step 3: Set NOT NULL constraint
ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL;
