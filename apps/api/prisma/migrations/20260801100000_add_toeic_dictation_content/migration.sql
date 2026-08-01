CREATE TYPE "toeic_dictation_publication_status" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "toeic_dictation_sets" (
  "id" SERIAL NOT NULL,
  "source" TEXT NOT NULL,
  "source_set_id" TEXT NOT NULL,
  "source_version" VARCHAR(64) NOT NULL,
  "collection_name" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "test_number" INTEGER NOT NULL,
  "part" INTEGER NOT NULL,
  "status" "toeic_dictation_publication_status" NOT NULL DEFAULT 'DRAFT',
  "published_at" TIMESTAMP(6),
  "item_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "toeic_dictation_sets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_dictation_sets_source_version_check" CHECK ("source_version" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "toeic_dictation_sets_test_number_check" CHECK ("test_number" BETWEEN 1 AND 10),
  CONSTRAINT "toeic_dictation_sets_part_check" CHECK ("part" BETWEEN 1 AND 4),
  CONSTRAINT "toeic_dictation_sets_item_count_check" CHECK ("item_count" >= 0)
);

CREATE TABLE "toeic_dictation_items" (
  "id" SERIAL NOT NULL,
  "set_id" INTEGER NOT NULL,
  "source_item_id" TEXT NOT NULL,
  "source_version" VARCHAR(64) NOT NULL,
  "order_index" INTEGER NOT NULL,
  "source_group" TEXT,
  "transcript" TEXT NOT NULL,
  "translation_vi" TEXT,
  "audio_asset_id" TEXT NOT NULL,
  "audio_storage_path" TEXT NOT NULL,
  "audio_sha256" VARCHAR(64) NOT NULL,
  "audio_bytes" INTEGER NOT NULL,
  "audio_content_type" TEXT NOT NULL,
  "audio_duration_ms" INTEGER,
  "validation_status" TEXT NOT NULL DEFAULT 'VALID',
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "toeic_dictation_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_dictation_items_source_version_check" CHECK ("source_version" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "toeic_dictation_items_order_check" CHECK ("order_index" >= 0),
  CONSTRAINT "toeic_dictation_items_audio_sha256_check" CHECK ("audio_sha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "toeic_dictation_items_audio_bytes_check" CHECK ("audio_bytes" > 0),
  CONSTRAINT "toeic_dictation_items_duration_check" CHECK ("audio_duration_ms" IS NULL OR "audio_duration_ms" > 0)
);

CREATE TABLE "toeic_dictation_progress" (
  "id" SERIAL NOT NULL,
  "user_id" TEXT NOT NULL,
  "item_id" INTEGER NOT NULL,
  "latest_accuracy" INTEGER NOT NULL DEFAULT 0,
  "words_correct" INTEGER NOT NULL DEFAULT 0,
  "total_words" INTEGER NOT NULL DEFAULT 0,
  "attempts_count" INTEGER NOT NULL DEFAULT 0,
  "mastered" BOOLEAN NOT NULL DEFAULT FALSE,
  "last_typed_text" TEXT,
  "last_attempted_at" TIMESTAMP(6),
  "completed_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "toeic_dictation_progress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_dictation_progress_accuracy_check" CHECK ("latest_accuracy" BETWEEN 0 AND 100),
  CONSTRAINT "toeic_dictation_progress_words_check" CHECK ("words_correct" >= 0 AND "total_words" >= 0 AND "words_correct" <= "total_words"),
  CONSTRAINT "toeic_dictation_progress_attempts_check" CHECK ("attempts_count" >= 0)
);

CREATE TABLE "toeic_dictation_attempts" (
  "id" SERIAL NOT NULL,
  "user_id" TEXT NOT NULL,
  "item_id" INTEGER NOT NULL,
  "source_version_snapshot" VARCHAR(64) NOT NULL,
  "submission_key" UUID NOT NULL,
  "typed_text" TEXT NOT NULL,
  "normalized_text" TEXT NOT NULL,
  "words_correct" INTEGER NOT NULL,
  "total_words" INTEGER NOT NULL,
  "accuracy" INTEGER NOT NULL,
  "word_results" JSONB NOT NULL,
  "submitted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "toeic_dictation_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_dictation_attempts_source_version_check" CHECK ("source_version_snapshot" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "toeic_dictation_attempts_accuracy_check" CHECK ("accuracy" BETWEEN 0 AND 100),
  CONSTRAINT "toeic_dictation_attempts_words_check" CHECK ("words_correct" >= 0 AND "total_words" > 0 AND "words_correct" <= "total_words")
);

CREATE UNIQUE INDEX "toeic_dictation_sets_source_set_key"
  ON "toeic_dictation_sets"("source", "source_set_id");
CREATE INDEX "toeic_dictation_sets_catalog_idx"
  ON "toeic_dictation_sets"("collection_name", "test_number", "part", "status");

CREATE UNIQUE INDEX "toeic_dictation_items_set_source_item_key"
  ON "toeic_dictation_items"("set_id", "source_item_id");
CREATE UNIQUE INDEX "toeic_dictation_items_set_order_key"
  ON "toeic_dictation_items"("set_id", "order_index");
CREATE INDEX "toeic_dictation_items_set_active_order_idx"
  ON "toeic_dictation_items"("set_id", "is_active", "order_index");

CREATE UNIQUE INDEX "toeic_dictation_progress_user_item_key"
  ON "toeic_dictation_progress"("user_id", "item_id");
CREATE INDEX "toeic_dictation_progress_user_updated_idx"
  ON "toeic_dictation_progress"("user_id", "updated_at" DESC);
CREATE INDEX "toeic_dictation_progress_item_idx"
  ON "toeic_dictation_progress"("item_id");

CREATE UNIQUE INDEX "toeic_dictation_attempts_user_submission_key"
  ON "toeic_dictation_attempts"("user_id", "submission_key");
CREATE INDEX "toeic_dictation_attempts_user_submitted_idx"
  ON "toeic_dictation_attempts"("user_id", "submitted_at");
CREATE INDEX "toeic_dictation_attempts_user_item_submitted_idx"
  ON "toeic_dictation_attempts"("user_id", "item_id", "submitted_at");
CREATE INDEX "toeic_dictation_attempts_item_idx"
  ON "toeic_dictation_attempts"("item_id");

ALTER TABLE "toeic_dictation_items"
  ADD CONSTRAINT "toeic_dictation_items_set_id_fkey"
  FOREIGN KEY ("set_id") REFERENCES "toeic_dictation_sets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "toeic_dictation_progress"
  ADD CONSTRAINT "toeic_dictation_progress_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "toeic_dictation_progress"
  ADD CONSTRAINT "toeic_dictation_progress_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "toeic_dictation_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "toeic_dictation_attempts"
  ADD CONSTRAINT "toeic_dictation_attempts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "toeic_dictation_attempts"
  ADD CONSTRAINT "toeic_dictation_attempts_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "toeic_dictation_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
