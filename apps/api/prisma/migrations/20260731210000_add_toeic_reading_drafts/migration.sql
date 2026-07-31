CREATE TABLE "toeic_reading_drafts" (
  "id" SERIAL NOT NULL,
  "user_id" TEXT NOT NULL,
  "test_id" INTEGER NOT NULL,
  "scope" VARCHAR(6) NOT NULL,
  "source_version" VARCHAR(64) NOT NULL,
  "active_question_id" INTEGER NOT NULL,
  "answers" JSONB NOT NULL,
  "review_question_ids" INTEGER[] NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(6) NOT NULL,

  CONSTRAINT "toeic_reading_drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_reading_drafts_scope_check"
    CHECK ("scope" IN ('FULL', 'PART_5', 'PART_6', 'PART_7'))
);

CREATE UNIQUE INDEX "toeic_reading_drafts_user_test_scope_key"
ON "toeic_reading_drafts"("user_id", "test_id", "scope");

CREATE INDEX "toeic_reading_drafts_user_updated_idx"
ON "toeic_reading_drafts"("user_id", "updated_at" DESC);

CREATE INDEX "toeic_reading_drafts_expires_idx"
ON "toeic_reading_drafts"("expires_at");

CREATE INDEX "toeic_reading_drafts_test_idx"
ON "toeic_reading_drafts"("test_id");

ALTER TABLE "toeic_reading_drafts"
ADD CONSTRAINT "toeic_reading_drafts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "toeic_reading_drafts"
ADD CONSTRAINT "toeic_reading_drafts_test_id_fkey"
FOREIGN KEY ("test_id") REFERENCES "toeic_tests"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
