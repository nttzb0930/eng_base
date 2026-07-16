import type {
  CourseDto,
  CourseLessonDto,
  CourseUnitDto,
  LessonChallengeDto,
  LessonChallengeOptionDto,
} from "@repo/shared/courses";

export type CourseViewModel = CourseDto;

export type CourseUnitViewModel = CourseUnitDto & {
  courses?: Pick<CourseDto, "id" | "title">;
};

export type CourseLessonViewModel = CourseLessonDto & {
  units?: Pick<CourseUnitDto, "id" | "title">;
};

export type LessonChallengeViewModel = LessonChallengeDto & {
  lessons?: Pick<CourseLessonDto, "id" | "title">;
};

export type LessonChallengeOptionViewModel = LessonChallengeOptionDto & {
  challenges?: Pick<LessonChallengeDto, "id" | "question">;
};
