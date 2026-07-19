ALTER TABLE "courses" ADD COLUMN "code" TEXT;

UPDATE "courses" SET "code" = 'course-' || "id"::text;

WITH "english_course" AS (
  SELECT "id"
  FROM "courses"
  WHERE "title" = 'English Vocabulary'
  ORDER BY "id"
  LIMIT 1
)
UPDATE "courses"
SET "code" = 'english-vocabulary'
WHERE "id" = (SELECT "id" FROM "english_course");

ALTER TABLE "courses" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");
