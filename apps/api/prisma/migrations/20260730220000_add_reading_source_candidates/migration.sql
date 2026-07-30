ALTER TABLE "reading_passages"
DROP CONSTRAINT "reading_passages_cefr_level_check";

ALTER TABLE "reading_passages"
ADD CONSTRAINT "reading_passages_cefr_level_check"
CHECK ("cefr_level" IN ('A1', 'A2', 'B1', 'B2'));

CREATE TYPE "reading_source_candidate_status" AS ENUM (
    'PENDING',
    'CONVERTED',
    'REJECTED'
);

CREATE TABLE "reading_source_candidates" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_version" TEXT NOT NULL,
    "content_sha256" VARCHAR(64) NOT NULL,
    "access_classification" TEXT NOT NULL,
    "license_name" TEXT NOT NULL,
    "license_reference" TEXT NOT NULL,
    "license_intended_use" TEXT NOT NULL,
    "approved_inventory_sha256" VARCHAR(64) NOT NULL,
    "source_level" VARCHAR(2) NOT NULL,
    "source_title" TEXT NOT NULL,
    "source_topic" TEXT,
    "source_html" TEXT NOT NULL,
    "plain_text_draft" TEXT NOT NULL,
    "canonical_json" JSONB NOT NULL,
    "status" "reading_source_candidate_status" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "converted_passage_id" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_source_candidates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reading_source_candidates_source_identity_key"
        UNIQUE ("source", "source_id", "source_version")
);

CREATE INDEX "reading_source_candidates_status_created_idx"
ON "reading_source_candidates"("status", "created_at");

CREATE INDEX "reading_source_candidates_converted_passage_idx"
ON "reading_source_candidates"("converted_passage_id");

ALTER TABLE "reading_source_candidates"
ADD CONSTRAINT "reading_source_candidates_converted_passage_id_fkey"
FOREIGN KEY ("converted_passage_id") REFERENCES "reading_passages"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;
