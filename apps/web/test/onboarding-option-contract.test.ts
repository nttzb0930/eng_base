import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const webRoot = join(import.meta.dirname, "..");
const readWebFile = (path: string) => readFileSync(join(webRoot, path), "utf8");

test("onboarding option components consume Shared authoritative IDs", () => {
  const language = readWebFile(
    "app/features/placement-test/onboarding/LanguageStep.tsx"
  );
  const goal = readWebFile(
    "app/features/placement-test/onboarding/GoalStep.tsx"
  );
  const intensity = readWebFile(
    "app/features/placement-test/onboarding/IntensityStep.tsx"
  );

  assert.match(language, /TARGET_LANGUAGE_IDS/);
  assert.match(language, /TargetLanguageId/);
  assert.match(language, /Record<\s*TargetLanguageId/);
  assert.doesNotMatch(language, /const LANGUAGES[^=]*=\s*\[/);

  assert.match(goal, /ONBOARDING_GOAL_IDS/);
  assert.match(goal, /OnboardingGoalId/);
  assert.match(goal, /Record<\s*OnboardingGoalId/);
  assert.doesNotMatch(goal, /const GOALS[^=]*=\s*\[/);

  assert.match(intensity, /LEARNING_INTENSITY_IDS/);
  assert.match(intensity, /LearningIntensityId/);
  assert.match(intensity, /Record<\s*LearningIntensityId/);
  assert.doesNotMatch(intensity, /const INTENSITIES[^=]*=\s*\[/);
});

test("placement onboarding state and confirmation inputs use Shared unions", () => {
  const types = readWebFile(
    "app/features/placement-test/types/placement-test.types.ts"
  );
  const onboarding = readWebFile(
    "app/features/placement-test/onboarding/NewUserOnboarding.tsx"
  );

  assert.match(types, /languages\?: TargetLanguageId\[\]/);
  assert.match(types, /goals\?: OnboardingGoalId\[\]/);
  assert.match(types, /intensity\?: LearningIntensityId/);
  assert.match(types, /primaryLanguage\?: TargetLanguageId/);
  assert.match(onboarding, /useState<TargetLanguageId\[\]>/);
  assert.match(onboarding, /useState<OnboardingGoalId\[\]>/);
  assert.match(onboarding, /useState<LearningIntensityId>/);
});
