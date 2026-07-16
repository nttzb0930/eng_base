-- Prepared only; apply through the reviewed database migration workflow.
CREATE UNIQUE INDEX "challenge_progress_user_challenge_idx"
ON "challenge_progress"("user_id", "challenge_id");
