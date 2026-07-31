CREATE TABLE "grammar_content_snapshots" (
  "id" SERIAL PRIMARY KEY,
  "source" TEXT NOT NULL,
  "snapshot_version" TEXT NOT NULL,
  "inventory_sha256" VARCHAR(64) NOT NULL,
  "content_sha256" VARCHAR(64) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "imported_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "grammar_snapshots_source_inventory_key" ON "grammar_content_snapshots"("source", "inventory_sha256");
CREATE INDEX "grammar_snapshots_source_active_idx" ON "grammar_content_snapshots"("source", "active");

CREATE TABLE "grammar_topics" (
  "id" SERIAL PRIMARY KEY, "snapshot_id" INTEGER NOT NULL, "source" TEXT NOT NULL,
  "source_topic_id" TEXT NOT NULL, "title_en" TEXT, "title_vi" TEXT NOT NULL,
  "description_vi" TEXT, "icon" TEXT, "order_index" INTEGER NOT NULL,
  CONSTRAINT "grammar_topics_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "grammar_content_snapshots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "grammar_topics_source_topic_key" ON "grammar_topics"("source", "source_topic_id");
CREATE INDEX "grammar_topics_snapshot_order_idx" ON "grammar_topics"("snapshot_id", "order_index");

CREATE TABLE "grammar_subtopics" (
  "id" SERIAL PRIMARY KEY, "snapshot_id" INTEGER NOT NULL, "topic_id" INTEGER NOT NULL,
  "source" TEXT NOT NULL, "source_subtopic_id" TEXT NOT NULL, "title_en" TEXT,
  "title_vi" TEXT NOT NULL, "description_vi" TEXT, "access_level" TEXT, "order_index" INTEGER NOT NULL,
  CONSTRAINT "grammar_subtopics_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "grammar_content_snapshots"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "grammar_subtopics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "grammar_topics"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "grammar_subtopics_source_subtopic_key" ON "grammar_subtopics"("source", "source_subtopic_id");
CREATE INDEX "grammar_subtopics_topic_order_idx" ON "grammar_subtopics"("topic_id", "order_index");

CREATE TABLE "grammar_questions" (
  "id" SERIAL PRIMARY KEY, "snapshot_id" INTEGER NOT NULL, "topic_id" INTEGER, "subtopic_id" INTEGER,
  "source" TEXT NOT NULL, "source_question_id" TEXT NOT NULL, "question_number" INTEGER,
  "question_text" TEXT NOT NULL, "explanation_vi" TEXT, "explanation_en" TEXT,
  "question_translation" TEXT, "answer_translation" TEXT, "vocabulary" JSONB NOT NULL,
  "prefer_ai_explanation" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "grammar_questions_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "grammar_content_snapshots"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "grammar_questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "grammar_topics"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "grammar_questions_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "grammar_subtopics"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "grammar_questions_source_question_key" ON "grammar_questions"("source", "source_question_id");
CREATE INDEX "grammar_questions_subtopic_number_idx" ON "grammar_questions"("subtopic_id", "question_number");

CREATE TABLE "grammar_question_options" (
  "id" SERIAL PRIMARY KEY, "question_id" INTEGER NOT NULL, "label" VARCHAR(1) NOT NULL,
  "text" TEXT NOT NULL, "correct" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "grammar_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "grammar_questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "grammar_question_options_question_label_key" ON "grammar_question_options"("question_id", "label");

CREATE TABLE "grammar_sets" (
  "id" SERIAL PRIMARY KEY, "snapshot_id" INTEGER NOT NULL, "source" TEXT NOT NULL,
  "source_set_id" TEXT NOT NULL, "name" TEXT NOT NULL, "year" INTEGER, "access_level" TEXT,
  CONSTRAINT "grammar_sets_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "grammar_content_snapshots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "grammar_sets_source_set_key" ON "grammar_sets"("source", "source_set_id");

CREATE TABLE "grammar_set_questions" (
  "id" SERIAL PRIMARY KEY, "set_id" INTEGER NOT NULL, "question_id" INTEGER NOT NULL, "order_index" INTEGER NOT NULL,
  CONSTRAINT "grammar_set_questions_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "grammar_sets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "grammar_set_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "grammar_questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "grammar_set_questions_set_question_key" ON "grammar_set_questions"("set_id", "question_id");
CREATE INDEX "grammar_set_questions_set_order_idx" ON "grammar_set_questions"("set_id", "order_index");

CREATE TABLE "grammar_question_difficulties" (
  "id" SERIAL PRIMARY KEY, "snapshot_id" INTEGER NOT NULL, "question_id" INTEGER NOT NULL,
  "level" INTEGER NOT NULL CHECK ("level" BETWEEN 1 AND 5),
  CONSTRAINT "grammar_difficulties_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "grammar_content_snapshots"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "grammar_difficulties_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "grammar_questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "grammar_question_difficulties_question_id_key" ON "grammar_question_difficulties"("question_id");
CREATE INDEX "grammar_difficulties_level_question_idx" ON "grammar_question_difficulties"("level", "question_id");
