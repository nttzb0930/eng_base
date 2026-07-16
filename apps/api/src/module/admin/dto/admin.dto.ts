import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsEnum } from "class-validator";

export class CourseCreateDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  imageSrc!: string;
}

export class CourseUpdateDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  imageSrc?: string;
}

export class UnitCreateDto {
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

export class UnitUpdateDto {
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

export class LessonCreateDto {
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

export class LessonUpdateDto {
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

export enum ChallengeType {
  SELECT = "SELECT",
  ASSIST = "ASSIST",
}

export enum ChallengeDirection {
  EN_TO_VI = "EN_TO_VI",
  VI_TO_EN = "VI_TO_EN",
}

export class ChallengeCreateDto {
  @IsNumber()
  @IsNotEmpty()
  lessonId!: number;

  @IsEnum(ChallengeType)
  @IsNotEmpty()
  type!: ChallengeType;

  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsNumber()
  @IsNotEmpty()
  order!: number;

  @IsNumber()
  @IsOptional()
  vocabularyItemId?: number | null;

  @IsEnum(ChallengeDirection)
  @IsOptional()
  direction?: ChallengeDirection | null;
}

export class ChallengeUpdateDto {
  @IsNumber()
  @IsOptional()
  lessonId?: number;

  @IsEnum(ChallengeType)
  @IsOptional()
  type?: ChallengeType;

  @IsString()
  @IsOptional()
  question?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsNumber()
  @IsOptional()
  vocabularyItemId?: number | null;

  @IsEnum(ChallengeDirection)
  @IsOptional()
  direction?: ChallengeDirection | null;
}

export class ChallengeOptionCreateDto {
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

export class ChallengeOptionUpdateDto {
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

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export class UserCreateDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;
}

export class UserUpdateDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
