ALTER TABLE "users"
ADD COLUMN "email_verified_at" TIMESTAMP(6),
ADD COLUMN "verification_code_hash" TEXT,
ADD COLUMN "verification_code_expires_at" TIMESTAMP(6),
ADD COLUMN "verification_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "verification_sent_at" TIMESTAMP(6);

-- Existing accounts predate email verification and remain usable.
UPDATE "users"
SET "email_verified_at" = "created_at"
WHERE "email_verified_at" IS NULL;

ALTER TABLE "users"
ADD CONSTRAINT "users_verification_attempts_check"
CHECK ("verification_attempts" >= 0);
