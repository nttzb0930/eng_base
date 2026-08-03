CREATE TABLE "toeic_writing_image_contexts" (
  "id" SERIAL PRIMARY KEY,
  "task_id" INTEGER NOT NULL,
  "image_sha256" VARCHAR(64) NOT NULL,
  "prompt_version" VARCHAR(64) NOT NULL,
  "model" VARCHAR(100) NOT NULL,
  "context" JSONB NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "toeic_writing_image_contexts_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "toeic_writing_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "toeic_writing_image_contexts_identity_key" UNIQUE ("task_id", "image_sha256", "prompt_version")
);

CREATE TABLE "toeic_writing_ai_grades" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "task_id" INTEGER NOT NULL,
  "content_version" VARCHAR(64) NOT NULL,
  "response_hash" VARCHAR(64) NOT NULL,
  "prompt_version" VARCHAR(64) NOT NULL,
  "part" INTEGER NOT NULL,
  "locale" VARCHAR(5) NOT NULL,
  "model" VARCHAR(100) NOT NULL,
  "rubric_version" VARCHAR(64) NOT NULL,
  "assistance" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "context_source" VARCHAR(20),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "toeic_writing_ai_grades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "toeic_writing_ai_grades_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "toeic_writing_tasks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "toeic_writing_ai_grades_cache_key" UNIQUE ("user_id", "task_id", "content_version", "response_hash", "prompt_version")
);

CREATE INDEX "toeic_writing_ai_grades_user_created_idx" ON "toeic_writing_ai_grades"("user_id", "created_at");
CREATE INDEX "toeic_writing_ai_grades_user_task_idx" ON "toeic_writing_ai_grades"("user_id", "task_id", "created_at");

CREATE TABLE "toeic_writing_assistance_events" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "task_id" INTEGER NOT NULL,
  "content_version" VARCHAR(64) NOT NULL,
  "kind" VARCHAR(32) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "toeic_writing_assistance_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "toeic_writing_assistance_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "toeic_writing_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "toeic_writing_assistance_events_identity_key" UNIQUE ("user_id", "task_id", "content_version", "kind")
);

CREATE INDEX "toeic_writing_assistance_events_user_created_idx" ON "toeic_writing_assistance_events"("user_id", "created_at");

CREATE TABLE "ai_usage_daily" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "feature" VARCHAR(40) NOT NULL,
  "usage_date" DATE NOT NULL,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "used" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_usage_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "ai_usage_daily_reserved_nonnegative" CHECK ("reserved" >= 0),
  CONSTRAINT "ai_usage_daily_used_nonnegative" CHECK ("used" >= 0),
  CONSTRAINT "ai_usage_daily_identity_key" UNIQUE ("user_id", "feature", "usage_date")
);

CREATE TABLE "ai_usage_reservations" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "feature" VARCHAR(40) NOT NULL,
  "idempotency_key" UUID NOT NULL,
  "response_hash" VARCHAR(64) NOT NULL,
  "usage_date" DATE NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "completed_at" TIMESTAMP(6),
  "released_at" TIMESTAMP(6),
  CONSTRAINT "ai_usage_reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "ai_usage_reservations_status_check" CHECK ("status" IN ('RESERVED', 'COMPLETED', 'RELEASED')),
  CONSTRAINT "ai_usage_reservations_user_key" UNIQUE ("user_id", "idempotency_key")
);

CREATE UNIQUE INDEX "ai_usage_reservations_one_active_writing_per_user"
  ON "ai_usage_reservations"("user_id")
  WHERE "status" = 'RESERVED' AND "feature" = 'TOEIC_WRITING';
CREATE INDEX "ai_usage_reservations_user_feature_created_idx" ON "ai_usage_reservations"("user_id", "feature", "created_at");
CREATE INDEX "ai_usage_reservations_status_expiry_idx" ON "ai_usage_reservations"("status", "expires_at");
