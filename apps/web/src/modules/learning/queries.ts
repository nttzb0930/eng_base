import { cache } from "react";
import type {
  Challenge,
  ChallengeOption,
  Course,
  CourseDetails,
  CourseProgress,
  LeaderboardUser,
  LessonDetails,
  LessonWithCompletion,
  LessonWithUnit,
  SavedVocabularyWord,
  UnitRecord,
  UnitWithLessons,
  UserProgress,
  UserSavedWord,
  UserVocabularyProgress,
  VocabularyExample,
  VocabularyItem,
} from "@repo/shared/learning";

import { apiRequest } from "@/src/lib/api-client";

export type {
  Challenge,
  ChallengeOption,
  Course,
  CourseProgress,
  LessonWithCompletion,
  LessonWithUnit,
  UnitRecord,
  UnitWithLessons,
  UserProgress,
  UserSavedWord,
  UserVocabularyProgress,
  VocabularyExample,
  VocabularyItem,
};

export const getCourses = cache(() =>
  apiRequest<Course[]>("/courses")
);

export const getUserProgress = cache(() =>
  apiRequest<UserProgress | null>("/progress/user-progress")
);

export const getUnits = cache(() =>
  apiRequest<UnitWithLessons[]>("/units")
);

export const getCourseById = cache((courseId: number) =>
  apiRequest<CourseDetails | null>(`/courses/${courseId}`)
);

export const getCourseProgress = cache(() =>
  apiRequest<CourseProgress | null>("/progress/course-progress")
);

export const getLesson = cache((id?: number) => {
  const query = id ? `?id=${id}` : "";
  return apiRequest<LessonDetails | null>(`/lessons${query}`);
});

export const getLessonPercentage = cache(() =>
  apiRequest<number>("/progress/lesson-percentage")
);

export const getSavedVocabularyWords = cache(() =>
  apiRequest<SavedVocabularyWord[]>("/vocabulary/saved-words")
);

export const getTopTenUsers = cache(() =>
  apiRequest<LeaderboardUser[]>("/leaderboard")
);
