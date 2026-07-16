-- CreateTable
CREATE TABLE "placement_test_sessions" (
    "user_id" TEXT NOT NULL,
    "current_theta" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "answered_count" INTEGER NOT NULL DEFAULT 0,
    "theta_history" DOUBLE PRECISION[],
    "used_word_ids" INTEGER[],
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "final_score" DOUBLE PRECISION,
    "recommended_level" TEXT,
    "buffer_options" TEXT[],
    "confirmed_level" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_test_sessions_pkey" PRIMARY KEY ("user_id")
);
