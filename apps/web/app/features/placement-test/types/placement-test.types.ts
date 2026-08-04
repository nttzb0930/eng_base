import type {
  LearningIntensityId,
  OnboardingGoalId,
  PlacementTestResponse,
  SubmitAnswerResponse,
  TargetLanguageId,
} from "@repo/shared";

export type {
  PlacementTestQuestion,
  PlacementTestResponse,
  SubmitAnswerResponse,
} from "@repo/shared";

export type SubmitPlacementAnswerInput = {
  challengeId: number;
  selectedOptionId: number;
};

export type ConfirmPlacementLevelInput = {
  level: string;
  languages?: TargetLanguageId[];
  goals?: OnboardingGoalId[];
  intensity?: LearningIntensityId;
  primaryLanguage?: TargetLanguageId;
  customGoal?: string;
};

export type ConfirmPlacementLevelResponse = {
  status: "CONFIRMED";
  confirmedLevel: string;
  activeCourseId?: number;
};

export type ResetPlacementTestResponse = {
  status: "RESET_SUCCESS";
};

export type UpdateOnboardingInput = {
  step: number;
  data: unknown;
};

export type UpdateOnboardingResponse = {
  onboarding_step: number;
  onboarding_data: unknown;
};

export type PlacementOnboardingData = {
  flowVersion?: number;
  selectedLangs?: TargetLanguageId[];
  primaryLang?: TargetLanguageId | null;
  selectedLevels?: Partial<Record<TargetLanguageId, string>>;
  selectedGoals?: OnboardingGoalId[];
  customGoal?: string;
  selectedIntensity?: LearningIntensityId;
};

export type PlacementTestApi = {
  nextQuestion: () => Promise<PlacementTestResponse>;
  submitAnswer: (
    input: SubmitPlacementAnswerInput,
  ) => Promise<SubmitAnswerResponse>;
  confirmLevel: (
    input: ConfirmPlacementLevelInput,
  ) => Promise<ConfirmPlacementLevelResponse>;
  reset: () => Promise<ResetPlacementTestResponse>;
  updateOnboarding: (
    input: UpdateOnboardingInput,
  ) => Promise<UpdateOnboardingResponse>;
};
