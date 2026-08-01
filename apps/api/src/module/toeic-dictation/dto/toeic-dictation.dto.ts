import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from "class-validator";

import type {
  ToeicDictationPart,
  ToeicDictationSubmitPayload,
} from "@repo/shared";

export class ToeicDictationQueryDto {
  @IsOptional()
  @IsIn(["2026"])
  collection?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  test?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3, 4])
  part?: ToeicDictationPart;
}

export class ToeicDictationCheckQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([30, 50, 100])
  hide = 50;
}

export class ToeicDictationSubmitDto implements ToeicDictationSubmitPayload {
  @IsInt()
  itemId!: number;

  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/u)
  sourceVersion!: string;

  @IsString()
  @Length(0, 5000)
  typedText!: string;

  @IsUUID()
  submissionKey!: string;

  @IsOptional()
  @IsIn(["check", "dictation", "full"])
  mode?: "check" | "dictation" | "full";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([30, 50, 100])
  hidePercent?: 30 | 50 | 100;
}
