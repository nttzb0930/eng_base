import type {
  PlacementTestResponse,
  SubmitAnswerResponse,
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
  languages?: string[];
  goals?: string[];
  intensity?: string;
  primaryLanguage?: string;
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
  selectedLangs?: string[];
  primaryLang?: string | null;
  selectedLevels?: Record<string, string>;
  selectedGoals?: string[];
  customGoal?: string;
  selectedIntensity?: string;
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
