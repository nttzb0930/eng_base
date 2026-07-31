CREATE TYPE "toeic_publication_status" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "toeic_test_sets" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "source_set_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "toeic_test_sets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "toeic_test_sets_source_check" CHECK (length(trim("source")) > 0),
    CONSTRAINT "toeic_test_sets_source_set_id_check" CHECK (length(trim("source_set_id")) > 0)
);

CREATE TABLE "toeic_tests" (
    "id" SERIAL NOT NULL,
    "test_set_id" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "source_test_id" TEXT NOT NULL,
    "source_version" VARCHAR(64) NOT NULL,
    "title" TEXT NOT NULL,
    "status" "toeic_publication_status" NOT NULL DEFAULT 'PUBLISHED',
    "published_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "toeic_tests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "toeic_tests_source_check" CHECK (length(trim("source")) > 0),
    CONSTRAINT "toeic_tests_source_test_id_check" CHECK (length(trim("source_test_id")) > 0),
    CONSTRAINT "toeic_tests_source_version_check" CHECK ("source_version" ~ '^[a-f0-9]{64}$')
);

CREATE TABLE "toeic_stimuli" (
    "id" SERIAL NOT NULL,
    "test_id" INTEGER NOT NULL,
    "source_stimulus_id" TEXT NOT NULL,
    "part" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT,
    "translation" TEXT,

    CONSTRAINT "toeic_stimuli_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "toeic_stimuli_part_check" CHECK ("part" IN (5, 6, 7)),
    CONSTRAINT "toeic_stimuli_kind_check" CHECK ("kind" IN ('text', 'image', 'mixed'))
);

CREATE TABLE "toeic_questions" (
    "id" SERIAL NOT NULL,
    "test_id" INTEGER NOT NULL,
    "stimulus_id" INTEGER,
    "source_question_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "part" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "translation" TEXT,
    "explanation" TEXT,
    "difficulty_level" INTEGER,
    "error_rate" DOUBLE PRECISION,
    "total_attempts" INTEGER,

    CONSTRAINT "toeic_questions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "toeic_questions_part_check" CHECK ("part" IN (5, 6, 7)),
    CONSTRAINT "toeic_questions_number_check" CHECK ("number" BETWEEN 101 AND 200),
    CONSTRAINT "toeic_questions_difficulty_check" CHECK ("difficulty_level" IS NULL OR "difficulty_level" BETWEEN 1 AND 5),
    CONSTRAINT "toeic_questions_error_rate_check" CHECK ("error_rate" IS NULL OR "error_rate" BETWEEN 0 AND 100),
    CONSTRAINT "toeic_questions_total_attempts_check" CHECK ("total_attempts" IS NULL OR "total_attempts" >= 0)
);

CREATE TABLE "toeic_question_options" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "label" VARCHAR(1) NOT NULL,
    "text" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "toeic_question_options_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "toeic_question_options_label_check" CHECK ("label" IN ('A', 'B', 'C', 'D'))
);

CREATE TABLE "toeic_media_assets" (
    "id" SERIAL NOT NULL,
    "test_id" INTEGER NOT NULL,
    "source_media_id" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "storage_path" TEXT,
    "sha256" VARCHAR(64),
    "bytes" INTEGER,
    "content_type" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "toeic_media_assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "toeic_media_assets_sha256_check" CHECK ("sha256" IS NULL OR "sha256" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "toeic_media_assets_bytes_check" CHECK ("bytes" IS NULL OR "bytes" >= 0),
    CONSTRAINT "toeic_media_assets_status_check" CHECK ("status" IN ('PENDING', 'DOWNLOADED'))
);

CREATE UNIQUE INDEX "toeic_test_sets_course_source_set_key"
ON "toeic_test_sets"("course_id", "source", "source_set_id");

CREATE UNIQUE INDEX "toeic_tests_source_test_id_key"
ON "toeic_tests"("source", "source_test_id");

CREATE INDEX "toeic_tests_status_published_idx"
ON "toeic_tests"("status", "published_at");

CREATE UNIQUE INDEX "toeic_stimuli_test_source_id_key"
ON "toeic_stimuli"("test_id", "source_stimulus_id");

CREATE INDEX "toeic_stimuli_test_part_idx"
ON "toeic_stimuli"("test_id", "part");

CREATE UNIQUE INDEX "toeic_questions_test_source_id_key"
ON "toeic_questions"("test_id", "source_question_id");

CREATE UNIQUE INDEX "toeic_questions_test_number_key"
ON "toeic_questions"("test_id", "number");

CREATE INDEX "toeic_questions_test_part_idx"
ON "toeic_questions"("test_id", "part");

CREATE INDEX "toeic_questions_stimulus_idx"
ON "toeic_questions"("stimulus_id");

CREATE UNIQUE INDEX "toeic_question_options_question_label_key"
ON "toeic_question_options"("question_id", "label");

CREATE UNIQUE INDEX "toeic_media_assets_test_source_id_key"
ON "toeic_media_assets"("test_id", "source_media_id");

ALTER TABLE "toeic_test_sets"
ADD CONSTRAINT "toeic_test_sets_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "toeic_tests"
ADD CONSTRAINT "toeic_tests_test_set_id_fkey"
FOREIGN KEY ("test_set_id") REFERENCES "toeic_test_sets"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "toeic_stimuli"
ADD CONSTRAINT "toeic_stimuli_test_id_fkey"
FOREIGN KEY ("test_id") REFERENCES "toeic_tests"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "toeic_questions"
ADD CONSTRAINT "toeic_questions_test_id_fkey"
FOREIGN KEY ("test_id") REFERENCES "toeic_tests"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "toeic_questions"
ADD CONSTRAINT "toeic_questions_stimulus_id_fkey"
FOREIGN KEY ("stimulus_id") REFERENCES "toeic_stimuli"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "toeic_question_options"
ADD CONSTRAINT "toeic_question_options_question_id_fkey"
FOREIGN KEY ("question_id") REFERENCES "toeic_questions"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "toeic_media_assets"
ADD CONSTRAINT "toeic_media_assets_test_id_fkey"
FOREIGN KEY ("test_id") REFERENCES "toeic_tests"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
