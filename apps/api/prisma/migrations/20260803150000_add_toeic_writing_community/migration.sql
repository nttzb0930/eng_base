ALTER TABLE "toeic_writing_submissions"
ADD COLUMN "shared_at" TIMESTAMP(6),
ADD COLUMN "share_revoked_at" TIMESTAMP(6);

CREATE INDEX "toeic_writing_submissions_task_shared_idx"
ON "toeic_writing_submissions"("task_id", "shared_at");
