ALTER TABLE "user_progress"
ADD COLUMN "languages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
ADD COLUMN "primary_language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "intensity" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN "custom_goal" TEXT;

ALTER TABLE "placement_test_sessions"
ADD COLUMN "onboarding_step" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "onboarding_data" JSONB;
