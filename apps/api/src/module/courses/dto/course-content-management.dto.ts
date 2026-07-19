import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";
import {
  LESSON_CHALLENGE_DIRECTIONS,
  LESSON_CHALLENGE_TYPES,
  type CreateCourseLessonPayload,
  type CreateCoursePayload,
  type CreateCourseUnitPayload,
  type CreateLessonChallengeOptionPayload,
  type CreateLessonChallengePayload,
  type LessonChallengeDirection,
  type LessonChallengeType,
  type UpdateCourseLessonPayload,
  type UpdateCoursePayload,
  type UpdateCourseUnitPayload,
  type UpdateLessonChallengeOptionPayload,
  type UpdateLessonChallengePayload,
} from "@repo/shared";
import { COURSE_CODE_PATTERN } from "../course.constants";

const CHALLENGE_TYPE_ENUM = Object.fromEntries(
  LESSON_CHALLENGE_TYPES.map((value) => [value, value])
) as Record<LessonChallengeType, LessonChallengeType>;

const CHALLENGE_DIRECTION_ENUM = Object.fromEntries(
  LESSON_CHALLENGE_DIRECTIONS.map((value) => [value, value])
) as Record<LessonChallengeDirection, LessonChallengeDirection>;

export class CourseCreateDto implements CreateCoursePayload {
  @IsString()
  @IsNotEmpty()
  @Matches(COURSE_CODE_PATTERN)
  code!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  imageSrc!: string;
}

export class CourseUpdateDto implements UpdateCoursePayload {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  imageSrc?: string;
}

export class UnitCreateDto implements CreateCourseUnitPayload {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @IsNotEmpty()
  courseId!: number;

  @IsNumber()
  @IsNotEmpty()
  order!: number;
}

export class UnitUpdateDto implements UpdateCourseUnitPayload {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  courseId?: number;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class LessonCreateDto implements CreateCourseLessonPayload {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsNumber()
  @IsNotEmpty()
  unitId!: number;

  @IsNumber()
  @IsNotEmpty()
  order!: number;
}

export class LessonUpdateDto implements UpdateCourseLessonPayload {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @IsOptional()
  unitId?: number;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class ChallengeCreateDto implements CreateLessonChallengePayload {
  @IsNumber()
  @IsNotEmpty()
  lessonId!: number;

  @IsEnum(CHALLENGE_TYPE_ENUM)
  @IsNotEmpty()
  type!: LessonChallengeType;

  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsNumber()
  @IsNotEmpty()
  order!: number;

  @IsNumber()
  @IsOptional()
  vocabularyItemId?: number | null;

  @IsEnum(CHALLENGE_DIRECTION_ENUM)
  @IsOptional()
  direction?: LessonChallengeDirection | null;
}

export class ChallengeUpdateDto implements UpdateLessonChallengePayload {
  @IsNumber()
  @IsOptional()
  lessonId?: number;

  @IsEnum(CHALLENGE_TYPE_ENUM)
  @IsOptional()
  type?: LessonChallengeType;

  @IsString()
  @IsOptional()
  question?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsNumber()
  @IsOptional()
  vocabularyItemId?: number | null;

  @IsEnum(CHALLENGE_DIRECTION_ENUM)
  @IsOptional()
  direction?: LessonChallengeDirection | null;
}

export class ChallengeOptionCreateDto implements CreateLessonChallengeOptionPayload {
  @IsNumber()
  @IsNotEmpty()
  challengeId!: number;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsBoolean()
  @IsNotEmpty()
  correct!: boolean;

  @IsString()
  @IsOptional()
  imageSrc?: string | null;

  @IsString()
  @IsOptional()
  audioSrc?: string | null;
}

export class ChallengeOptionUpdateDto implements UpdateLessonChallengeOptionPayload {
  @IsNumber()
  @IsOptional()
  challengeId?: number;

  @IsString()
  @IsOptional()
  text?: string;

  @IsBoolean()
  @IsOptional()
  correct?: boolean;

  @IsString()
  @IsOptional()
  imageSrc?: string | null;

  @IsString()
  @IsOptional()
  audioSrc?: string | null;
}
