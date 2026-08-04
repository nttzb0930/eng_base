import type {
  Course,
  CourseLesson,
  CourseUnit,
  LessonChallengeDirection,
  LessonChallengeOption,
  LessonChallengeType,
} from "./course.js";
import type { ChallengeProgress } from "./progress.js";
import type { VocabularyItem } from "./vocabulary.js";

export type Challenge = {
  id: number;
  lessonId: number;
  vocabularyItemId: number | null;
  type: LessonChallengeType;
  direction: LessonChallengeDirection | null;
  question: string;
  order: number;
  challengeOptions: LessonChallengeOption[];
  challengeProgress: ChallengeProgress[];
  vocabularyItem: VocabularyItem | null;
};

export type LessonWithChallenges = CourseLesson & {
  challenges: Challenge[];
};

export type LessonWithCompletion = CourseLesson & {
  completed: boolean;
};

export type LessonWithUnit = CourseLesson & {
  unit: CourseUnit;
};

export type UnitWithLessons = CourseUnit & {
  lessons: LessonWithCompletion[];
};

export type CourseDetails = Course & {
  units: Array<CourseUnit & { lessons: CourseLesson[] }>;
};

export type LessonDetails = LessonWithChallenges & {
  challenges: Array<Challenge & { completed: boolean }>;
};

export type LeaderboardPeriod = "weekly" | "monthly" | "alltime";

export type LeaderboardUser = {
  userId: string;
  userName: string;
  userImageSrc: string;
  points: number;
  rank: number;
  level?: number;
  streak?: number;
  weeklyGain?: number;
  trend?: "up" | "down" | "neutral";
  trendValue?: number;
};

export type LeaderboardResponse = {
  seasonInfo: {
    seasonNumber: number;
    daysRemaining: number;
  };
  currentUserRank: {
    rank: number;
    totalLearners: number;
    points: number;
    nextRankPointsNeeded: number;
    nextRankNumber: number;
    percentileText: string;
  };
  topUsers: LeaderboardUser[];
  totalLearners: number;
};

