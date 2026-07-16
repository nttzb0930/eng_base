import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class SubmitPlacementAnswerDto {
  @IsInt()
  challengeId!: number;

  @IsInt()
  selectedOptionId!: number;
}

export class ConfirmPlacementLevelDto {
  @IsString()
  level!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @IsString()
  @IsOptional()
  primaryLanguage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  goals?: string[];

  @IsString()
  @IsOptional()
  intensity?: string;

  @IsString()
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
