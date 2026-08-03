import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Matches,
  Min,
} from "class-validator";
import type {
  ToeicWritingCoachingKind,
  ToeicWritingDraftPayload,
  ToeicWritingPartOneGradeRequest,
  ToeicWritingPart,
  ToeicWritingSubmissionPayload,
} from "@repo/shared";

export class ToeicWritingPartQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  part!: ToeicWritingPart;
}

export class ToeicWritingPartOneGradeDto implements ToeicWritingPartOneGradeRequest {
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  contentVersion!: string;

  @IsString()
  responseText!: string;

  @IsUUID()
  idempotencyKey!: string;

  @IsIn(["en", "vi"])
  locale!: "en" | "vi";
}

export class ToeicWritingAssistanceDto {
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  contentVersion!: string;
}

export class ToeicWritingCoachingParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  taskId!: number;

  @IsIn(["OUTLINE", "VOCABULARY", "SAMPLE"])
  kind!: ToeicWritingCoachingKind;
}

export class ToeicWritingCoachingQueryDto {
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  contentVersion!: string;
}

export class ToeicWritingGradeHistoryQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  cursor?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 20;
}

export enum ToeicWritingAssistanceKind {
  OUTLINE = "OUTLINE",
  VOCABULARY = "VOCABULARY",
  SAMPLE = "SAMPLE",
  COMMUNITY_RESTORE = "COMMUNITY_RESTORE",
}

export class ToeicWritingDraftDto implements ToeicWritingDraftPayload {
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  contentVersion!: string;

  @IsString()
  responseText!: string;
}

export class ToeicWritingSubmissionDto
  extends ToeicWritingDraftDto
  implements ToeicWritingSubmissionPayload
{
  @IsUUID()
  submissionKey!: string;
}
