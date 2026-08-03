CREATE TYPE "toeic_writing_publication_status" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "toeic_writing_sets" (
  "id" SERIAL NOT NULL,
  "course_id" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "source_set_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "toeic_writing_sets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_writing_sets_order_check" CHECK ("order_index" > 0),
  CONSTRAINT "toeic_writing_sets_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "toeic_writing_sets_course_source_key"
    UNIQUE ("course_id", "source", "source_set_id")
);

CREATE TABLE "toeic_writing_tasks" (
  "id" SERIAL NOT NULL,
  "set_id" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "source_task_id" TEXT NOT NULL,
  "part" INTEGER NOT NULL,
  "order_index" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL,
  "instructions_en" TEXT NOT NULL,
  "instructions_vi" TEXT,
  "payload" JSONB NOT NULL,
  "image_storage_path" TEXT,
  "image_sha256" VARCHAR(64),
  "image_bytes" INTEGER,
  "image_content_type" TEXT,
  "source_version" VARCHAR(64) NOT NULL,
  "content_sha256" VARCHAR(64) NOT NULL,
  "provenance" JSONB NOT NULL,
  "license_reference" TEXT NOT NULL,
  "status" "toeic_writing_publication_status" NOT NULL DEFAULT 'DRAFT',
  "published_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "toeic_writing_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_writing_tasks_source_task_key"
    UNIQUE ("source", "source_task_id"),
  CONSTRAINT "toeic_writing_tasks_set_part_order_key"
    UNIQUE ("set_id", "part", "order_index"),
  CONSTRAINT "toeic_writing_tasks_part_check" CHECK ("part" IN (1, 2)),
  CONSTRAINT "toeic_writing_tasks_order_check" CHECK ("order_index" > 0),
  CONSTRAINT "toeic_writing_tasks_source_version_check"
    CHECK (char_length("source_version") = 64),
  CONSTRAINT "toeic_writing_tasks_content_sha256_check"
    CHECK (char_length("content_sha256") = 64),
  CONSTRAINT "toeic_writing_tasks_image_sha256_check"
    CHECK ("image_sha256" IS NULL OR char_length("image_sha256") = 64),
  CONSTRAINT "toeic_writing_tasks_image_bytes_check" CHECK ("image_bytes" > 0),
  CONSTRAINT "toeic_writing_tasks_part_media_check" CHECK (
    (
      "part" = 1
      AND "image_storage_path" IS NOT NULL
      AND "image_sha256" IS NOT NULL
      AND "image_bytes" IS NOT NULL
      AND "image_content_type" IS NOT NULL
    )
    OR
    (
      "part" = 2
      AND "image_storage_path" IS NULL
      AND "image_sha256" IS NULL
      AND "image_bytes" IS NULL
      AND "image_content_type" IS NULL
    )
  ),
  CONSTRAINT "toeic_writing_tasks_set_id_fkey"
    FOREIGN KEY ("set_id") REFERENCES "toeic_writing_sets"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "toeic_writing_drafts" (
  "id" SERIAL NOT NULL,
  "user_id" TEXT NOT NULL,
  "task_id" INTEGER NOT NULL,
  "response_text" TEXT NOT NULL,
  "content_version" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "toeic_writing_drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_writing_drafts_user_task_key" UNIQUE ("user_id", "task_id"),
  CONSTRAINT "toeic_writing_drafts_content_version_check"
    CHECK (char_length("content_version") = 64),
  CONSTRAINT "toeic_writing_drafts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "toeic_writing_drafts_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "toeic_writing_tasks"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "toeic_writing_submissions" (
  "id" SERIAL NOT NULL,
  "user_id" TEXT NOT NULL,
  "task_id" INTEGER NOT NULL,
  "submission_key" UUID NOT NULL,
  "response_text" TEXT NOT NULL,
  "content_version" VARCHAR(64) NOT NULL,
  "submitted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "toeic_writing_submissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "toeic_writing_submissions_user_key"
    UNIQUE ("user_id", "submission_key"),
  CONSTRAINT "toeic_writing_submissions_content_version_check"
    CHECK (char_length("content_version") = 64),
  CONSTRAINT "toeic_writing_submissions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "toeic_writing_submissions_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "toeic_writing_tasks"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE INDEX "toeic_writing_sets_course_order_idx"
ON "toeic_writing_sets"("course_id", "order_index");

CREATE INDEX "toeic_writing_tasks_catalog_idx"
ON "toeic_writing_tasks"("status", "part", "order_index");

CREATE INDEX "toeic_writing_submissions_user_submitted_idx"
ON "toeic_writing_submissions"("user_id", "submitted_at");

CREATE INDEX "toeic_writing_submissions_user_task_idx"
ON "toeic_writing_submissions"("user_id", "task_id");
