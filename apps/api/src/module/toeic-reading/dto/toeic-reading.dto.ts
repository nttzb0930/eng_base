import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateNested,
} from "class-validator";
import type {
  ToeicReadingDraftPayload,
  ToeicReadingSubmissionPayload,
} from "@repo/shared";
import type { ToeicReadingPart } from "@repo/shared";

export class ToeicReadingPartQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([5, 6, 7])
  part?: ToeicReadingPart;
}

class ToeicReadingAnswerDto {
  @IsInt()
  questionId!: number;

  @IsInt()
  optionId!: number;
}

export class ToeicReadingDraftDto implements ToeicReadingDraftPayload {
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  sourceVersion!: string;

  @IsOptional()
  @IsInt()
  @IsIn([5, 6, 7])
  practicePart?: ToeicReadingPart;

  @IsInt()
  activeQuestionId!: number;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ToeicReadingAnswerDto)
  answers!: ToeicReadingAnswerDto[];

  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsInt({ each: true })
  reviewQuestionIds!: number[];
}

export class ToeicReadingSubmissionDto implements ToeicReadingSubmissionPayload {
  @IsUUID()
  submissionKey!: string;

  @IsInt()
  testId!: number;

  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  sourceVersion!: string;

  @IsOptional()
  @IsInt()
  @IsIn([5, 6, 7])
  practicePart?: ToeicReadingPart;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ToeicReadingAnswerDto)
  answers!: ToeicReadingAnswerDto[];
}
