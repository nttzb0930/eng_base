ALTER TABLE "toeic_writing_submissions"
ADD COLUMN "task_title" TEXT,
ADD COLUMN "task_part" INTEGER,
ADD COLUMN "reference_snapshot" JSONB;

UPDATE "toeic_writing_submissions" AS submission
SET
  "task_title" = task."title",
  "task_part" = task."part",
  "reference_snapshot" = CASE
    WHEN task."part" = 1 THEN jsonb_build_object(
      'samplesEn', task."payload"->'samplesEn',
      'samplesVi', task."payload"->'samplesVi',
      'structureSuggestions', task."payload"->'structureSuggestions',
      'ideas', task."payload"->'ideas'
    )
    ELSE jsonb_build_object(
      'sampleEn', task."payload"->'sampleEn',
      'sampleVi', task."payload"->'sampleVi',
      'outlineLevel1', task."payload"->'outlineLevel1',
      'outlineLevel2', task."payload"->'outlineLevel2',
      'chunksLevel1', task."payload"->'chunksLevel1',
      'chunksLevel2', task."payload"->'chunksLevel2'
    )
  END
FROM "toeic_writing_tasks" AS task
WHERE task."id" = submission."task_id";

ALTER TABLE "toeic_writing_submissions"
ALTER COLUMN "task_title" SET NOT NULL,
ALTER COLUMN "task_part" SET NOT NULL,
ALTER COLUMN "reference_snapshot" SET NOT NULL,
ADD CONSTRAINT "toeic_writing_submissions_task_part_check"
  CHECK ("task_part" IN (1, 2));
