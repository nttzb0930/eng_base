CREATE TABLE "grammar_lessons" (
  "id" SERIAL PRIMARY KEY,
  "snapshot_id" INTEGER NOT NULL,
  "subtopic_id" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "source_lesson_id" TEXT NOT NULL,
  "title_en" TEXT,
  "title_vi" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "theory_content_en" TEXT,
  "theory_content_vi" TEXT,
  "lesson_content_json" JSONB,
  "html_content" TEXT,
  "order_index" INTEGER NOT NULL,
  CONSTRAINT "grammar_lessons_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "grammar_content_snapshots"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "grammar_lessons_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "grammar_subtopics"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "grammar_lessons_source_lesson_key" ON "grammar_lessons"("source", "source_lesson_id");
CREATE INDEX "grammar_lessons_subtopic_order_idx" ON "grammar_lessons"("subtopic_id", "order_index");
