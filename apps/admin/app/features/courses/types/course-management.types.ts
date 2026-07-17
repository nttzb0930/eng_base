import type {
  Course,
  CourseLesson,
  CourseUnit,
  LessonChallenge,
  LessonChallengeOption,
} from "@repo/shared";

export type CourseViewModel = Course;

export type CourseUnitViewModel = CourseUnit & {
  courses?: Pick<Course, "id" | "title">;
};

export type CourseLessonViewModel = CourseLesson & {
  units?: Pick<CourseUnit, "id" | "title">;
};

export type LessonChallengeViewModel = LessonChallenge & {
  lessons?: Pick<CourseLesson, "id" | "title">;
};

export type LessonChallengeOptionViewModel = LessonChallengeOption & {
  challenges?: Pick<LessonChallenge, "id" | "question">;
};
