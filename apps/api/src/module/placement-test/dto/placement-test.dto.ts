import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";
import {
  CEFR_LEVELS,
  LEARNING_INTENSITY_IDS,
  ONBOARDING_GOAL_IDS,
  TARGET_LANGUAGE_IDS,
  type CefrLevel,
  type LearningIntensityId,
  type OnboardingGoalId,
  type TargetLanguageId,
} from "@repo/shared";

import { IsPrimaryLanguageSelected } from "./is-primary-language-selected.validator";

export class SubmitPlacementAnswerDto {
  @IsInt()
  challengeId!: number;

  @IsInt()
  selectedOptionId!: number;
}

export class ConfirmPlacementLevelDto {
  @IsIn([...CEFR_LEVELS])
  level!: CefrLevel;

  @IsArray()
  @IsIn([...TARGET_LANGUAGE_IDS], { each: true })
  @IsOptional()
  languages?: TargetLanguageId[];

  @IsIn([...TARGET_LANGUAGE_IDS])
  @IsPrimaryLanguageSelected()
  @IsOptional()
  primaryLanguage?: TargetLanguageId;

  @IsArray()
  @IsIn([...ONBOARDING_GOAL_IDS], { each: true })
  @IsOptional()
  goals?: OnboardingGoalId[];

  @IsIn([...LEARNING_INTENSITY_IDS])
  @IsOptional()
  intensity?: LearningIntensityId;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(300)
  @IsOptional()
  customGoal?: string;
}

export class UpdateOnboardingDto {
  @IsInt()
  @Min(0)
  step!: number;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}
