export type SystemSettings = {
  maxHearts: number;
  practiceWordsPerLesson: number;
  weakWordsLimit: number;
  dailyReviewRelaxedLimit: number;
  dailyReviewStandardLimit: number;
  dailyReviewAcceleratedLimit: number;
  dailyReviewIntensiveLimit: number;
  registrationEnabled: boolean;
};

export type UpdateSystemSettingsPayload = Partial<SystemSettings>;
