ALTER TABLE "toeic_stimuli"
DROP CONSTRAINT "toeic_stimuli_part_check";

ALTER TABLE "toeic_stimuli"
ADD CONSTRAINT "toeic_stimuli_part_check"
CHECK ("part" IN (1, 2, 3, 4, 5, 6, 7));

ALTER TABLE "toeic_stimuli"
DROP CONSTRAINT "toeic_stimuli_kind_check";

ALTER TABLE "toeic_stimuli"
ADD CONSTRAINT "toeic_stimuli_kind_check"
CHECK ("kind" IN ('text', 'image', 'audio', 'mixed'));
