CREATE TABLE "grammar_question_attempts" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_question_id" TEXT NOT NULL,
    "submission_key" UUID NOT NULL,
    "submission_fingerprint" TEXT NOT NULL,
    "snapshot_version" VARCHAR(64) NOT NULL,
    "practice_mode" VARCHAR(8) NOT NULL,
    "practice_target" TEXT NOT NULL,
    "question_id_snapshot" INTEGER NOT NULL,
    "question_number_snapshot" INTEGER,
    "question_text_snapshot" TEXT NOT NULL,
    "selected_option_id_snapshot" INTEGER NOT NULL,
    "selected_option_label_snapshot" VARCHAR(1) NOT NULL,
    "selected_option_text_snapshot" TEXT NOT NULL,
    "correct_option_id_snapshot" INTEGER NOT NULL,
    "correct_option_label_snapshot" VARCHAR(1) NOT NULL,
    "correct_option_text_snapshot" TEXT NOT NULL,
    "explanation_vi_snapshot" TEXT,
    "explanation_en_snapshot" TEXT,
    "question_translation_snapshot" TEXT,
    "answer_translation_snapshot" TEXT,
    "vocabulary_snapshot" JSONB NOT NULL,
    "collection_progress_snapshot" JSONB NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "attempted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grammar_question_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "grammar_attempts_snapshot_version_check" CHECK ("snapshot_version" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "grammar_attempts_practice_mode_check" CHECK ("practice_mode" IN ('topic', 'subtopic', 'set', 'level')),
    CONSTRAINT "grammar_attempts_selected_label_check" CHECK ("selected_option_label_snapshot" IN ('A', 'B', 'C', 'D')),
    CONSTRAINT "grammar_attempts_correct_label_check" CHECK ("correct_option_label_snapshot" IN ('A', 'B', 'C', 'D'))
);

CREATE TABLE "grammar_question_progress" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_question_id" TEXT NOT NULL,
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "last_selected_option_label" VARCHAR(1) NOT NULL,
    "last_correct" BOOLEAN NOT NULL,
    "first_answered_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grammar_question_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "grammar_progress_counts_check" CHECK ("attempts_count" > 0 AND "correct_count" BETWEEN 0 AND "attempts_count"),
    CONSTRAINT "grammar_progress_selected_label_check" CHECK ("last_selected_option_label" IN ('A', 'B', 'C', 'D'))
);

CREATE UNIQUE INDEX "grammar_attempts_user_submission_key"
ON "grammar_question_attempts"("user_id", "submission_key");

CREATE INDEX "grammar_attempts_user_attempted_idx"
ON "grammar_question_attempts"("user_id", "attempted_at");

CREATE INDEX "grammar_attempts_user_question_attempted_idx"
ON "grammar_question_attempts"("user_id", "source", "source_question_id", "attempted_at");

CREATE UNIQUE INDEX "grammar_progress_user_source_question_key"
ON "grammar_question_progress"("user_id", "source", "source_question_id");

CREATE INDEX "grammar_progress_user_updated_idx"
ON "grammar_question_progress"("user_id", "updated_at");

ALTER TABLE "grammar_question_attempts"
ADD CONSTRAINT "grammar_question_attempts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "grammar_question_progress"
ADD CONSTRAINT "grammar_question_progress_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
