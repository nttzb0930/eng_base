import {
  LESSON_CHALLENGE_DIRECTIONS,
  LESSON_CHALLENGE_TYPES,
} from "../constants/course.js";
import type { CefrLevel } from "../constants/cefr.js";
import type { PaginatedResponse } from "./common.js";

export type LessonChallengeType = (typeof LESSON_CHALLENGE_TYPES)[number];
export type LessonChallengeDirection =
  (typeof LESSON_CHALLENGE_DIRECTIONS)[number];

export type Course = {
  id: number;
  code: string;
  title: string;
  imageSrc: string;
};

export type CourseUnit = {
  id: number;
  title: string;
  description: string;
  courseId: number;
  order: number;
  cefrLevel: CefrLevel | null;
};

export type CourseLesson = {
  id: number;
  title: string;
  unitId: number;
  order: number;
};

export type LessonChallenge = {
  id: number;
  lessonId: number;
  type: LessonChallengeType;
  direction: LessonChallengeDirection | null;
  question: string;
  order: number;
  vocabularyItemId: number | null;
};

export type LessonChallengeOption = {
  id: number;
  challengeId: number;
  text: string;
  correct: boolean;
  imageSrc: string | null;
  audioSrc: string | null;
};

export type PaginatedCoursesResponse = PaginatedResponse<Course>;
export type PaginatedCourseUnitsResponse = PaginatedResponse<CourseUnit>;
export type PaginatedCourseLessonsResponse = PaginatedResponse<CourseLesson>;
export type PaginatedLessonChallengesResponse =
  PaginatedResponse<LessonChallenge>;
export type PaginatedLessonChallengeOptionsResponse =
  PaginatedResponse<LessonChallengeOption>;

export type CreateCoursePayload = Pick<Course, "code" | "title" | "imageSrc">;
export type UpdateCoursePayload = Partial<Pick<Course, "title" | "imageSrc">>;
export type CreateCourseUnitPayload = Omit<CourseUnit, "id">;
export type UpdateCourseUnitPayload = Partial<CreateCourseUnitPayload>;
export type CreateCourseLessonPayload = Omit<CourseLesson, "id">;
export type UpdateCourseLessonPayload = Partial<CreateCourseLessonPayload>;
export type CreateLessonChallengePayload = Omit<
  LessonChallenge,
  "id" | "direction" | "vocabularyItemId"
> & {
  direction?: LessonChallengeDirection | null;
  vocabularyItemId?: number | null;
};
export type UpdateLessonChallengePayload =
  Partial<CreateLessonChallengePayload>;
export type CreateLessonChallengeOptionPayload = Omit<
  LessonChallengeOption,
  "id" | "imageSrc" | "audioSrc"
> & {
  imageSrc?: string | null;
  audioSrc?: string | null;
};
export type UpdateLessonChallengeOptionPayload =
  Partial<CreateLessonChallengeOptionPayload>;

export type CourseQueryParams = {
  page: number;
  limit: number;
  search?: string;
};
export type CourseUnitQueryParams = CourseQueryParams;
export type CourseLessonQueryParams = CourseQueryParams;
export type LessonChallengeQueryParams = CourseQueryParams;
export type LessonChallengeOptionQueryParams = CourseQueryParams;
