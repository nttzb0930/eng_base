CREATE TABLE "toeic_reading_practice_sessions" (
  "id" SERIAL NOT NULL,
  "user_id" TEXT NOT NULL,
  "test_id" INTEGER NOT NULL,
  "part" INTEGER NOT NULL,
  "source_version" VARCHAR(64) NOT NULL,
  "status" VARCHAR(12) NOT NULL,
  "active_key" TEXT,
  "active_question_id" INTEGER NOT NULL,
  "review_question_ids" INTEGER[] NOT NULL,
  "correct_count" INTEGER NOT NULL DEFAULT 0,
  "incorrect_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(6),

  CONSTRAINT "toeic_reading_practice_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_reading_practice_sessions_part_check"
    CHECK ("part" IN (5, 6, 7)),
  CONSTRAINT "toeic_reading_practice_sessions_status_check"
    CHECK ("status" IN ('ACTIVE', 'COMPLETED')),
  CONSTRAINT "toeic_reading_practice_sessions_counts_check"
    CHECK ("correct_count" >= 0 AND "incorrect_count" >= 0)
);

CREATE TABLE "toeic_reading_practice_answers" (
  "id" SERIAL NOT NULL,
  "session_id" INTEGER NOT NULL,
  "request_key" UUID NOT NULL,
  "question_id_snapshot" INTEGER NOT NULL,
  "question_number_snapshot" INTEGER NOT NULL,
  "selected_option_id_snapshot" INTEGER NOT NULL,
  "selected_option_label_snapshot" VARCHAR(1) NOT NULL,
  "selected_option_text_snapshot" TEXT NOT NULL,
  "correct_option_id_snapshot" INTEGER NOT NULL,
  "correct_option_label_snapshot" VARCHAR(1) NOT NULL,
  "correct_option_text_snapshot" TEXT NOT NULL,
  "explanation_snapshot" TEXT,
  "question_translation_snapshot" TEXT,
  "correct" BOOLEAN NOT NULL,
  "answered_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "toeic_reading_practice_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "toeic_reading_practice_sessions_active_key_key"
ON "toeic_reading_practice_sessions"("active_key");

CREATE INDEX "toeic_reading_practice_sessions_user_updated_idx"
ON "toeic_reading_practice_sessions"("user_id", "updated_at" DESC);

CREATE INDEX "toeic_reading_practice_sessions_test_part_idx"
ON "toeic_reading_practice_sessions"("test_id", "part");

CREATE UNIQUE INDEX "toeic_reading_practice_answers_session_question_key"
ON "toeic_reading_practice_answers"("session_id", "question_id_snapshot");

CREATE UNIQUE INDEX "toeic_reading_practice_answers_session_request_key_key"
ON "toeic_reading_practice_answers"("session_id", "request_key");

CREATE INDEX "toeic_reading_practice_answers_session_answered_idx"
ON "toeic_reading_practice_answers"("session_id", "answered_at");

ALTER TABLE "toeic_reading_practice_sessions"
ADD CONSTRAINT "toeic_reading_practice_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "toeic_reading_practice_sessions"
ADD CONSTRAINT "toeic_reading_practice_sessions_test_id_fkey"
FOREIGN KEY ("test_id") REFERENCES "toeic_tests"("id")
ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "toeic_reading_practice_answers"
ADD CONSTRAINT "toeic_reading_practice_answers_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "toeic_reading_practice_sessions"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
