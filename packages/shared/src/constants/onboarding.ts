export const TARGET_LANGUAGE_IDS = ["en", "ja", "de", "zh", "ko"] as const;
export type TargetLanguageId = (typeof TARGET_LANGUAGE_IDS)[number];

export const ONBOARDING_GOAL_IDS = [
  "travel",
  "career",
  "exams",
  "culture",
  "study_abroad",
  "hobby",
] as const;
export type OnboardingGoalId = (typeof ONBOARDING_GOAL_IDS)[number];

export const LEARNING_INTENSITY_IDS = [
  "relaxed",
  "standard",
  "accelerated",
  "intensive",
] as const;
export type LearningIntensityId = (typeof LEARNING_INTENSITY_IDS)[number];
