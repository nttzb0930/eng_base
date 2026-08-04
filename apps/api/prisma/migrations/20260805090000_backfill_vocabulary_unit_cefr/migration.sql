-- Vocabulary units created by older development seed versions may have a
-- missing CEFR value even though the canonical course requires one.
UPDATE "units" AS "unit"
SET "cefr_level" = CASE "unit"."order"
  WHEN 1 THEN 'A1'
  WHEN 2 THEN 'A2'
  WHEN 3 THEN 'B1'
  WHEN 4 THEN 'B2'
END
FROM "courses" AS "course"
WHERE "unit"."course_id" = "course"."id"
  AND "course"."code" = 'english-vocabulary'
  AND "unit"."cefr_level" IS NULL;
