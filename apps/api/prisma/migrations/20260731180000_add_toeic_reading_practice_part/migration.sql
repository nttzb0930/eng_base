ALTER TABLE "toeic_reading_attempts"
ADD COLUMN "practice_part" INTEGER;

ALTER TABLE "toeic_reading_attempts"
ADD CONSTRAINT "toeic_reading_attempts_practice_part_check"
CHECK ("practice_part" IS NULL OR "practice_part" IN (5, 6, 7));

CREATE INDEX "toeic_reading_attempts_user_practice_part_submitted_idx"
ON "toeic_reading_attempts"("user_id", "practice_part", "submitted_at" DESC);
