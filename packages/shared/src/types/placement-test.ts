export type PlacementTestQuestion = {
  status: "IN_PROGRESS";
  questionNumber: number;
  onboardingStep?: number;
  onboardingData?: Record<string, unknown>;
  challenge: {
    id: number;
    direction: "EN_TO_VI" | "VI_TO_EN" | null;
    question: string;
    word: string | null;
    primaryMeaningVi: string | null;
    options: { id: number; text: string; correct?: boolean }[];
    audioUrl: string | null;
  };
};

export type PlacementTestCompleted = {
  status: "COMPLETED";
  finalScore: number;
  recommendedLevel: string;
  inBufferZone: boolean;
  bufferOptions: string[];
};

export type PlacementTestConfirmed = {
  status: "CONFIRMED";
  confirmedLevel: string;
};

export type PlacementTestResponse =
  | PlacementTestQuestion
  | PlacementTestCompleted
  | PlacementTestConfirmed;

export type SubmitAnswerResponse =
  | { status: "IN_PROGRESS"; isCorrect: boolean }
  | {
      status: "COMPLETED";
      isCorrect: boolean;
      finalScore: number;
      inBufferZone: boolean;
      bufferOptions: string[];
      recommendedLevel: string;
    };
