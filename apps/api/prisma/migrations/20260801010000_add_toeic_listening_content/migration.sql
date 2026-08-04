ALTER TABLE "toeic_tests"
ADD COLUMN "listening_source_version" VARCHAR(64),
ADD COLUMN "listening_status" "toeic_publication_status" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "listening_published_at" TIMESTAMP(6);

ALTER TABLE "toeic_stimuli"
ADD COLUMN "transcript" TEXT,
ADD COLUMN "transcript_translation" TEXT;

ALTER TABLE "toeic_questions"
ADD COLUMN "transcript" TEXT,
ADD COLUMN "transcript_translation" TEXT;

CREATE TABLE "toeic_media_bindings" (
  "id" SERIAL NOT NULL,
  "media_asset_id" INTEGER NOT NULL,
  "question_id" INTEGER,
  "stimulus_id" INTEGER,
  "role" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "toeic_media_bindings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_media_bindings_role_check" CHECK ("role" IN ('AUDIO', 'IMAGE')),
  CONSTRAINT "toeic_media_bindings_exactly_one_owner_check" CHECK (
    ("question_id" IS NOT NULL) <> ("stimulus_id" IS NOT NULL)
  ),
  CONSTRAINT "toeic_media_bindings_media_asset_id_fkey"
    FOREIGN KEY ("media_asset_id") REFERENCES "toeic_media_assets"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "toeic_media_bindings_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "toeic_questions"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "toeic_media_bindings_stimulus_id_fkey"
    FOREIGN KEY ("stimulus_id") REFERENCES "toeic_stimuli"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "toeic_media_bindings_question_asset_role_key"
ON "toeic_media_bindings"("question_id", "media_asset_id", "role");

CREATE UNIQUE INDEX "toeic_media_bindings_stimulus_asset_role_key"
ON "toeic_media_bindings"("stimulus_id", "media_asset_id", "role");

CREATE INDEX "toeic_media_bindings_question_idx"
ON "toeic_media_bindings"("question_id", "order");

CREATE INDEX "toeic_media_bindings_stimulus_idx"
ON "toeic_media_bindings"("stimulus_id", "order");

CREATE INDEX "toeic_media_bindings_asset_idx"
ON "toeic_media_bindings"("media_asset_id");

CREATE INDEX "toeic_tests_listening_status_published_idx"
ON "toeic_tests"("listening_status", "listening_published_at");
