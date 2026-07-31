CREATE TABLE "toeic_question_vocabulary_cache" (
  "question_id" INTEGER NOT NULL,
  "vocabulary" JSONB NOT NULL,
  "source_inventory_sha256" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "toeic_question_vocabulary_cache_pkey" PRIMARY KEY ("question_id")
);

ALTER TABLE "toeic_question_vocabulary_cache"
  ADD CONSTRAINT "toeic_question_vocabulary_cache_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "toeic_questions"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX "toeic_question_vocabulary_cache_inventory_idx"
  ON "toeic_question_vocabulary_cache"("source_inventory_sha256");
