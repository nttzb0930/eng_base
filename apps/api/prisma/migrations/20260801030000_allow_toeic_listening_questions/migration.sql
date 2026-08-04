ALTER TABLE "toeic_questions"
DROP CONSTRAINT "toeic_questions_part_check";

ALTER TABLE "toeic_questions"
ADD CONSTRAINT "toeic_questions_part_check"
CHECK ("part" IN (1, 2, 3, 4, 5, 6, 7));

ALTER TABLE "toeic_questions"
DROP CONSTRAINT "toeic_questions_number_check";

ALTER TABLE "toeic_questions"
ADD CONSTRAINT "toeic_questions_number_check"
CHECK ("number" BETWEEN 1 AND 200);
