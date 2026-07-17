import type { Course } from "./course.js";
import type { LessonWithUnit } from "./learning.js";

export type ChallengeProgress = {
  id: number;
  userId: string;
  challengeId: number;
  completed: boolean;
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

export type CourseProgress = {
  activeLesson?: LessonWithUnit;
  activeLessonId?: number;
};
