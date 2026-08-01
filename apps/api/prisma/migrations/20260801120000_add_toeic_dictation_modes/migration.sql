CREATE TYPE "toeic_dictation_practice_mode" AS ENUM ('CHECK', 'DICTATION', 'FULL');

ALTER TABLE "toeic_dictation_attempts"
  ADD COLUMN "practice_mode" "toeic_dictation_practice_mode" NOT NULL DEFAULT 'DICTATION',
  ADD COLUMN "hide_percent" INTEGER;

ALTER TABLE "toeic_dictation_attempts"
  ADD CONSTRAINT "toeic_dictation_attempts_hide_percent_check"
  CHECK ("hide_percent" IS NULL OR "hide_percent" IN (30, 50, 100));

CREATE INDEX "toeic_dictation_attempts_user_mode_submitted_idx"
  ON "toeic_dictation_attempts"("user_id", "practice_mode", "submitted_at");
