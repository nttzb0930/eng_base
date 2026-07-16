-- CreateEnum
CREATE TYPE "challenge_direction" AS ENUM ('EN_TO_VI', 'VI_TO_EN');

-- CreateEnum
CREATE TYPE "type" AS ENUM ('SELECT', 'ASSIST');

-- CreateTable
CREATE TABLE "challenge_options" (
    "id" SERIAL NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "image_src" TEXT,
    "audio_src" TEXT,

    CONSTRAINT "challenge_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_progress" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "type" "type" NOT NULL,
    "question" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "vocabulary_item_id" INTEGER,
    "direction" "challenge_direction",

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "image_src" TEXT NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "course_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL DEFAULT 'User',
    "user_image_src" TEXT NOT NULL DEFAULT '/mascot.svg',
    "active_course_id" INTEGER,
    "hearts" INTEGER NOT NULL DEFAULT 5,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "accuracy" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_session_items" (
    "id" SERIAL NOT NULL,
    "practice_session_id" INTEGER NOT NULL,
    "vocabulary_item_id" INTEGER NOT NULL,
    "challenge_type" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answer" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_session_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_saved_words" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "vocabulary_item_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_vocabulary_progress" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "vocabulary_item_id" INTEGER NOT NULL,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "mastery_level" TEXT NOT NULL DEFAULT 'new',
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval_days" INTEGER NOT NULL DEFAULT 0,
    "repetition_count" INTEGER NOT NULL DEFAULT 0,
    "last_reviewed_at" TIMESTAMP(6),
    "next_review_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_vocabulary_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_items" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "normalized_word" TEXT NOT NULL,
    "pos" TEXT NOT NULL,
    "pos_vi" TEXT,
    "cefr_level" TEXT NOT NULL,
    "phonetic" TEXT,
    "phonetic_source" TEXT,
    "audio_url" TEXT,
    "audio_source" TEXT,
    "example_en" TEXT,
    "example_vi" TEXT,
    "example_source" TEXT,
    "meaning_vi" TEXT NOT NULL,
    "primary_meaning_vi" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'words-cefr-dictionary',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_examples" (
    "id" SERIAL NOT NULL,
    "vocabulary_item_id" INTEGER NOT NULL,
    "example_en" TEXT NOT NULL,
    "example_vi" TEXT,
    "source" TEXT NOT NULL DEFAULT 'free-dictionary-api',
    "order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_topics" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_item_topics" (
    "id" SERIAL NOT NULL,
    "vocabulary_item_id" INTEGER NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_item_topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_sessions_user_created_idx" ON "practice_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "practice_session_items_session_idx" ON "practice_session_items"("practice_session_id");

-- CreateIndex
CREATE INDEX "practice_session_items_vocab_idx" ON "practice_session_items"("vocabulary_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_saved_words_user_vocab_idx" ON "user_saved_words"("user_id", "vocabulary_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_vocabulary_progress_user_vocab_idx" ON "user_vocabulary_progress"("user_id", "vocabulary_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_examples_vocab_example_idx" ON "vocabulary_examples"("vocabulary_item_id", "example_en");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_topics_slug_key" ON "vocabulary_topics"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vocab_item_topics_item_topic_idx" ON "vocabulary_item_topics"("vocabulary_item_id", "topic_id");

-- AddForeignKey
ALTER TABLE "challenge_options" ADD CONSTRAINT "challenge_options_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_vocabulary_item_id_vocabulary_items_id_fk" FOREIGN KEY ("vocabulary_item_id") REFERENCES "vocabulary_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_active_course_id_courses_id_fk" FOREIGN KEY ("active_course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_session_id_fk" FOREIGN KEY ("practice_session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_vocab_item_id_fk" FOREIGN KEY ("vocabulary_item_id") REFERENCES "vocabulary_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_saved_words" ADD CONSTRAINT "user_saved_words_vocabulary_item_id_vocabulary_items_id_fk" FOREIGN KEY ("vocabulary_item_id") REFERENCES "vocabulary_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_vocabulary_progress" ADD CONSTRAINT "user_vocab_progress_vocab_item_id_fk" FOREIGN KEY ("vocabulary_item_id") REFERENCES "vocabulary_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vocabulary_examples" ADD CONSTRAINT "vocabulary_examples_vocabulary_item_id_fk" FOREIGN KEY ("vocabulary_item_id") REFERENCES "vocabulary_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vocabulary_item_topics" ADD CONSTRAINT "vocab_item_topics_vocab_item_id_fk" FOREIGN KEY ("vocabulary_item_id") REFERENCES "vocabulary_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vocabulary_item_topics" ADD CONSTRAINT "vocab_item_topics_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "vocabulary_topics"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
