ALTER TABLE "users"
  ADD COLUMN "password_reset_code_hash" TEXT,
  ADD COLUMN "password_reset_code_expires_at" TIMESTAMP(6),
  ADD COLUMN "password_reset_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "password_reset_sent_at" TIMESTAMP(6);

ALTER TABLE "users"
  ADD CONSTRAINT "users_password_reset_attempts_non_negative"
  CHECK ("password_reset_attempts" >= 0);
