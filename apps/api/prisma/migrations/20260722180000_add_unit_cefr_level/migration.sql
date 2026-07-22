ALTER TABLE "units" ADD COLUMN "cefr_level" VARCHAR(2);

UPDATE "units" AS "unit"
SET "cefr_level" = CASE "unit"."order"
  WHEN 1 THEN 'A1'
  WHEN 2 THEN 'A2'
  WHEN 3 THEN 'B1'
  WHEN 4 THEN 'B2'
END
FROM "courses" AS "course"
WHERE "unit"."course_id" = "course"."id"
  AND "course"."code" = 'english-vocabulary';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "units" AS "unit"
    INNER JOIN "courses" AS "course" ON "course"."id" = "unit"."course_id"
    WHERE "course"."code" = 'english-vocabulary'
      AND "unit"."cefr_level" IS NULL
  ) THEN
    RAISE EXCEPTION 'Unable to map every English vocabulary Unit to CEFR A1-B2';
  END IF;
END $$;

ALTER TABLE "units"
ADD CONSTRAINT "units_cefr_level_check"
CHECK ("cefr_level" IS NULL OR "cefr_level" IN ('A1', 'A2', 'B1', 'B2'));

CREATE INDEX "units_course_id_cefr_level_idx"
ON "units"("course_id", "cefr_level");
