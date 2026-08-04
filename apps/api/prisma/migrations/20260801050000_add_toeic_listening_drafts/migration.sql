CREATE TABLE "toeic_listening_drafts" (
  "id" SERIAL NOT NULL, "user_id" TEXT NOT NULL, "test_id" INTEGER NOT NULL,
  "scope" VARCHAR(6) NOT NULL, "listening_source_version" VARCHAR(64) NOT NULL,
  "active_question_id" INTEGER NOT NULL, "answers" JSONB NOT NULL,
  "review_question_ids" INTEGER[] NOT NULL, "completed_media_ids" INTEGER[] NOT NULL,
  "active_media_id" INTEGER, "playback_position_ms" INTEGER NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "toeic_listening_drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_listening_drafts_scope_check" CHECK ("scope" IN ('FULL', 'PART_1', 'PART_2', 'PART_3', 'PART_4')),
  CONSTRAINT "toeic_listening_drafts_position_check" CHECK ("playback_position_ms" >= 0)
);
CREATE UNIQUE INDEX "toeic_listening_drafts_user_test_scope_key" ON "toeic_listening_drafts"("user_id", "test_id", "scope");
CREATE INDEX "toeic_listening_drafts_user_updated_idx" ON "toeic_listening_drafts"("user_id", "updated_at" DESC);
CREATE INDEX "toeic_listening_drafts_expires_idx" ON "toeic_listening_drafts"("expires_at");
CREATE INDEX "toeic_listening_drafts_test_idx" ON "toeic_listening_drafts"("test_id");
ALTER TABLE "toeic_listening_drafts" ADD CONSTRAINT "toeic_listening_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "toeic_listening_drafts" ADD CONSTRAINT "toeic_listening_drafts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "toeic_tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
