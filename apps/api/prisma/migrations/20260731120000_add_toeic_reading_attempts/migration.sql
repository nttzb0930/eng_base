CREATE TABLE "toeic_reading_attempts" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "test_id" INTEGER NOT NULL,
    "submission_key" UUID NOT NULL,
    "submission_fingerprint" TEXT NOT NULL,
    "source_version_snapshot" VARCHAR(64) NOT NULL,
    "test_title_snapshot" TEXT NOT NULL,
    "correct_count" INTEGER NOT NULL,
    "total_count" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "toeic_reading_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "toeic_reading_attempts_source_version_check" CHECK ("source_version_snapshot" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "toeic_reading_attempts_totals_check" CHECK ("total_count" > 0 AND "correct_count" BETWEEN 0 AND "total_count"),
    CONSTRAINT "toeic_reading_attempts_accuracy_check" CHECK ("accuracy" BETWEEN 0 AND 100)
);

CREATE TABLE "toeic_reading_attempt_answers" (
    "id" SERIAL NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "question_id_snapshot" INTEGER NOT NULL,
    "question_number_snapshot" INTEGER NOT NULL,
    "part_snapshot" INTEGER NOT NULL,
    "selected_option_id_snapshot" INTEGER NOT NULL,
    "question_prompt_snapshot" TEXT NOT NULL,
    "selected_option_label_snapshot" VARCHAR(1) NOT NULL,
    "selected_option_text_snapshot" TEXT NOT NULL,
    "correct_option_label_snapshot" VARCHAR(1) NOT NULL,
    "correct_option_text_snapshot" TEXT NOT NULL,
    "explanation_snapshot" TEXT,
    "correct" BOOLEAN NOT NULL,

    CONSTRAINT "toeic_reading_attempt_answers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "toeic_reading_attempt_answers_question_number_check" CHECK ("question_number_snapshot" BETWEEN 101 AND 200),
    CONSTRAINT "toeic_reading_attempt_answers_part_check" CHECK ("part_snapshot" IN (5, 6, 7)),
    CONSTRAINT "toeic_reading_attempt_answers_selected_label_check" CHECK ("selected_option_label_snapshot" IN ('A', 'B', 'C', 'D')),
    CONSTRAINT "toeic_reading_attempt_answers_correct_label_check" CHECK ("correct_option_label_snapshot" IN ('A', 'B', 'C', 'D'))
);

CREATE UNIQUE INDEX "toeic_reading_attempts_user_submission_key_key"
ON "toeic_reading_attempts"("user_id", "submission_key");

CREATE INDEX "toeic_reading_attempts_user_submitted_idx"
ON "toeic_reading_attempts"("user_id", "submitted_at");

CREATE INDEX "toeic_reading_attempts_test_idx"
ON "toeic_reading_attempts"("test_id");

CREATE UNIQUE INDEX "toeic_reading_attempt_answers_attempt_question_key"
ON "toeic_reading_attempt_answers"("attempt_id", "question_id_snapshot");

CREATE INDEX "toeic_reading_attempt_answers_attempt_part_idx"
ON "toeic_reading_attempt_answers"("attempt_id", "part_snapshot");

ALTER TABLE "toeic_reading_attempts"
ADD CONSTRAINT "toeic_reading_attempts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "toeic_reading_attempts"
ADD CONSTRAINT "toeic_reading_attempts_test_id_fkey"
FOREIGN KEY ("test_id") REFERENCES "toeic_tests"("id")
ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "toeic_reading_attempt_answers"
ADD CONSTRAINT "toeic_reading_attempt_answers_attempt_id_fkey"
FOREIGN KEY ("attempt_id") REFERENCES "toeic_reading_attempts"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
