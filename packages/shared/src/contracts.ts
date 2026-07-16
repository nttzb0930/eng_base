import type {
  CourseDto,
  CourseLessonDto,
  CourseUnitDto,
  LessonChallengeDirection,
  LessonChallengeOptionDto,
  LessonChallengeType,
} from "./courses/index.js";

/** @deprecated Import CourseDto from @repo/shared/courses. */
export type Course = CourseDto;

/** @deprecated Import CourseUnitDto from @repo/shared/courses. */
export type UnitRecord = CourseUnitDto;

/** @deprecated Import CourseLessonDto from @repo/shared/courses. */
export type LessonRecord = CourseLessonDto;

export type VocabularyExample = {
  id: number;
  vocabularyItemId: number;
  exampleEn: string;
  exampleVi: string | null;
  source: string;
  order: number;
  createdAt: Date;
};

export type UserVocabularyProgress = {
  id: number;
  userId: string;
  vocabularyItemId: number;
  correctCount: number;
  wrongCount: number;
  reviewCount: number;
  masteryLevel: string;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserSavedWord = {
  id: number;
  userId: string;
  vocabularyItemId: number;
  createdAt: Date;
};

export type VocabularyItem = {
  id: number;
  word: string;
  normalizedWord: string;
  pos: string;
  posVi: string | null;
  cefrLevel: string;
  phonetic: string | null;
  phoneticSource: string | null;
  audioUrl: string | null;
  audioSource: string | null;
  exampleEn: string | null;
  exampleVi: string | null;
  exampleSource: string | null;
  meaningVi: string;
  primaryMeaningVi: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  userSavedWords: UserSavedWord[];
  userVocabularyProgress: UserVocabularyProgress[];
  vocabularyExamples: VocabularyExample[];
};

/** @deprecated Import LessonChallengeOptionDto from @repo/shared/courses. */
export type ChallengeOption = LessonChallengeOptionDto;

export type ChallengeProgress = {
  id: number;
  userId: string;
  challengeId: number;
  completed: boolean;
};

export type Challenge = {
  id: number;
  lessonId: number;
  vocabularyItemId: number | null;
  type: LessonChallengeType;
  direction: LessonChallengeDirection | null;
  question: string;
  order: number;
  challengeOptions: ChallengeOption[];
  challengeProgress: ChallengeProgress[];
  vocabularyItem: VocabularyItem | null;
};

export type LessonWithChallenges = LessonRecord & {
  challenges: Challenge[];
};

export type LessonWithCompletion = LessonRecord & {
  completed: boolean;
};

export type LessonWithUnit = LessonRecord & {
  unit: UnitRecord;
};

export type UnitWithLessons = UnitRecord & {
  lessons: LessonWithCompletion[];
};

export type UserProgress = {
  userId: string;
  userName: string;
  userImageSrc: string;
  activeCourseId: number | null;
  hearts: number;
  points: number;
  activeCourse: Course | null;
  isPlacementTestConfirmed: boolean;
  primaryLanguage: string;
};

export type CourseDetails = Course & {
  units: Array<UnitRecord & { lessons: LessonRecord[] }>;
};

export type CourseProgress = {
  activeLesson?: LessonWithUnit;
  activeLessonId?: number;
};

export type LessonDetails = LessonWithChallenges & {
  challenges: Array<Challenge & { completed: boolean }>;
};

export type SavedVocabularyWord = UserSavedWord & {
  vocabularyItem: VocabularyItem;
};

export type LeaderboardUser = {
  userId: string;
  userName: string;
  userImageSrc: string;
  points: number;
};

export type PracticeCefrLevel = "A1" | "A2" | "B1" | "B2";

export type PracticeLevelSummary = Record<
  PracticeCefrLevel,
  {
    words: number;
    lessons: number;
    unlockedLessons: number;
  }
>;

export type FillBlankPracticeChallenge = {
  id: number;
  type: "FILL_BLANK";
  direction: "CONTEXT_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
  challengeOptions: ChallengeOption[];
};

export type ListeningPracticeChallenge = {
  id: number;
  type: "LISTEN_SELECT";
  direction: "AUDIO_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
  challengeOptions: ChallengeOption[];
};

export type DictationPracticeChallenge = {
  id: number;
  type: "AUDIO_TO_TEXT";
  direction: "AUDIO_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
};

export type ReviewChallenge = {
  id: number;
  type: "SELECT" | "ASSIST" | "LISTEN_SELECT" | "FILL_BLANK" | "AUDIO_TO_TEXT";
  direction: "EN_TO_VI" | "VI_TO_EN" | "AUDIO_TO_EN" | "CONTEXT_TO_EN";
  question: string;
  vocabularyItem: VocabularyItem;
  challengeOptions: ChallengeOption[];
};

export type WeakWordsPracticeChallenge = Omit<ReviewChallenge, "type"> & {
  type: "SELECT" | "ASSIST" | "LISTEN_SELECT" | "FILL_BLANK";
};
export type DailyReviewChallenge = ReviewChallenge;
export type SavedWordReviewChallenge = Omit<ReviewChallenge, "type"> & {
  type: "SELECT" | "ASSIST" | "LISTEN_SELECT" | "FILL_BLANK";
};

export type ReviewSummary = {
  total: number;
  due: number;
  weak: number;
  saved: number;
};

export type WeakWordsSummary = {
  total: number;
  due: number;
  learning: number;
  wrong: number;
};

export type SavedWordsReviewSummary = {
  total: number;
  due: number;
  new: number;
  learning: number;
  review: number;
  mastered: number;
};

export type FlashcardSummary = {
  due: number;
  saved: number;
  weak: number;
  levels: Record<PracticeCefrLevel, number>;
};

export type DashboardStats = {
  overview: {
    totalVocabulary: number;
    learnedWords: number;
    masteredWords: number;
    dueWords: number;
    weakWords: number;
    savedWords: number;
    totalReviews: number;
    correctCount: number;
    wrongCount: number;
    accuracy: number;
  };
  levelProgress: Array<{
    level: PracticeCefrLevel;
    total: number;
    learned: number;
    mastered: number;
    accuracy: number;
  }>;
  topWeakWords: Array<{
    id: number;
    word: string;
    meaning: string;
    cefrLevel: string;
    wrongCount: number;
    correctCount: number;
    accuracy: number;
  }>;
  recentSessions: Array<{
    id: number;
    mode: string;
    correctCount: number;
    wrongCount: number;
    accuracy: number;
    createdAt: Date;
  }>;
  activity: Array<{
    date: string;
    sessionCount: number;
    wordCount: number;
    accuracy: number;
  }>;
  modeAccuracy: Array<{
    mode: string;
    sessionCount: number;
    correctCount: number;
    wrongCount: number;
    accuracy: number;
  }>;
};

export type VocabularyTopic = {
  id: number;
  slug: string;
  title: string;
  description: string;
  order: number;
  total: number;
  learned: number;
  mastered: number;
};

export type VocabularyTopicDetails = VocabularyTopic & {
  selectedLevel?: PracticeCefrLevel;
  countsByLevel: Record<PracticeCefrLevel, number>;
  stats: Pick<VocabularyTopic, "total" | "learned" | "mastered">;
  filteredStats: Pick<VocabularyTopic, "total" | "learned" | "mastered">;
  items: VocabularyItem[];
};

export type PlacementTestQuestion = {
  status: "IN_PROGRESS";
  questionNumber: number;
  onboardingStep?: number;
  onboardingData?: any;
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
  PlacementTestQuestion | PlacementTestCompleted | PlacementTestConfirmed;

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
