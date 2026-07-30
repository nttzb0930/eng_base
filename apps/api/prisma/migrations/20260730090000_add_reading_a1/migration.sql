CREATE TYPE "reading_publication_status" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "reading_passages" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "cefr_level" VARCHAR(2) NOT NULL,
    "topic_id" INTEGER,
    "estimated_minutes" INTEGER NOT NULL,
    "status" "reading_publication_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_passages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reading_passages_cefr_level_check"
        CHECK ("cefr_level" IN ('A1', 'A2', 'B1', 'B2')),
    CONSTRAINT "reading_passages_estimated_minutes_check"
        CHECK ("estimated_minutes" > 0)
);

CREATE TABLE "reading_questions" (
    "id" SERIAL NOT NULL,
    "passage_id" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "reading_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reading_options" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reading_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reading_attempts" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "passage_id" INTEGER NOT NULL,
    "submission_key" UUID NOT NULL,
    "submission_fingerprint" TEXT NOT NULL,
    "passage_title_snapshot" TEXT NOT NULL,
    "correct_count" INTEGER NOT NULL,
    "total_count" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reading_attempts_score_check"
        CHECK (
            "correct_count" >= 0
            AND "total_count" > 0
            AND "correct_count" <= "total_count"
            AND "accuracy" BETWEEN 0 AND 100
        )
);

CREATE TABLE "reading_attempt_answers" (
    "id" SERIAL NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "question_id_snapshot" INTEGER NOT NULL,
    "selected_option_id_snapshot" INTEGER NOT NULL,
    "question_prompt_snapshot" TEXT NOT NULL,
    "selected_option_text_snapshot" TEXT NOT NULL,
    "correct_option_text_snapshot" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,

    CONSTRAINT "reading_attempt_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reading_passages_slug_key"
ON "reading_passages"("slug");

CREATE INDEX "reading_passages_level_status_idx"
ON "reading_passages"("cefr_level", "status");

CREATE UNIQUE INDEX "reading_questions_passage_order_key"
ON "reading_questions"("passage_id", "order");

CREATE UNIQUE INDEX "reading_options_question_order_key"
ON "reading_options"("question_id", "order");

CREATE UNIQUE INDEX "reading_attempts_user_submission_key_key"
ON "reading_attempts"("user_id", "submission_key");

CREATE INDEX "reading_attempts_user_submitted_idx"
ON "reading_attempts"("user_id", "submitted_at");

CREATE UNIQUE INDEX "reading_attempt_answers_attempt_question_key"
ON "reading_attempt_answers"("attempt_id", "question_id_snapshot");

ALTER TABLE "reading_passages"
ADD CONSTRAINT "reading_passages_topic_id_fkey"
FOREIGN KEY ("topic_id") REFERENCES "vocabulary_topics"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "reading_questions"
ADD CONSTRAINT "reading_questions_passage_id_fkey"
FOREIGN KEY ("passage_id") REFERENCES "reading_passages"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "reading_options"
ADD CONSTRAINT "reading_options_question_id_fkey"
FOREIGN KEY ("question_id") REFERENCES "reading_questions"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "reading_attempts"
ADD CONSTRAINT "reading_attempts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "reading_attempts"
ADD CONSTRAINT "reading_attempts_passage_id_fkey"
FOREIGN KEY ("passage_id") REFERENCES "reading_passages"("id")
ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "reading_attempt_answers"
ADD CONSTRAINT "reading_attempt_answers_attempt_id_fkey"
FOREIGN KEY ("attempt_id") REFERENCES "reading_attempts"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
