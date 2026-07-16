import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import {
  LESSON_CHALLENGE_DIRECTIONS,
  LESSON_CHALLENGE_TYPES,
  type CreateCourseLessonRequest,
  type CreateCourseRequest,
  type CreateCourseUnitRequest,
  type CreateLessonChallengeOptionRequest,
  type CreateLessonChallengeRequest,
  type LessonChallengeDirection,
  type LessonChallengeType,
  type UpdateCourseLessonRequest,
  type UpdateCourseRequest,
  type UpdateCourseUnitRequest,
  type UpdateLessonChallengeOptionRequest,
  type UpdateLessonChallengeRequest,
} from "@repo/shared/courses";

const CHALLENGE_TYPE_ENUM = Object.fromEntries(
  LESSON_CHALLENGE_TYPES.map((value) => [value, value])
) as Record<LessonChallengeType, LessonChallengeType>;

const CHALLENGE_DIRECTION_ENUM = Object.fromEntries(
  LESSON_CHALLENGE_DIRECTIONS.map((value) => [value, value])
) as Record<LessonChallengeDirection, LessonChallengeDirection>;

export class CourseCreateDto implements CreateCourseRequest {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  imageSrc!: string;
}

export class CourseUpdateDto implements UpdateCourseRequest {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  imageSrc?: string;
}

export class UnitCreateDto implements CreateCourseUnitRequest {
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

export class UnitUpdateDto implements UpdateCourseUnitRequest {
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

export class LessonCreateDto implements CreateCourseLessonRequest {
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

export class LessonUpdateDto implements UpdateCourseLessonRequest {
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

export class ChallengeCreateDto implements CreateLessonChallengeRequest {
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

export class ChallengeUpdateDto implements UpdateLessonChallengeRequest {
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

export class ChallengeOptionCreateDto implements CreateLessonChallengeOptionRequest {
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

export class ChallengeOptionUpdateDto implements UpdateLessonChallengeOptionRequest {
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
