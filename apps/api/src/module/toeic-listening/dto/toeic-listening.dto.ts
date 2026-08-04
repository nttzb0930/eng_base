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
  ToeicListeningDraftPayload,
  ToeicListeningAnswerCheckPayload,
  ToeicListeningPart,
  ToeicListeningSubmissionPayload,
} from "@repo/shared";

export class ToeicListeningPartQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3, 4])
  part?: ToeicListeningPart;
}

export class ToeicListeningAnswerCheckDto implements ToeicListeningAnswerCheckPayload {
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  listeningSourceVersion!: string;
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3, 4])
  practicePart!: ToeicListeningPart;
  @Type(() => Number)
  @IsInt()
  questionId!: number;
  @Type(() => Number)
  @IsInt()
  optionId!: number;
}

export class ToeicListeningDraftDto implements ToeicListeningDraftPayload {
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  listeningSourceVersion!: string;
  @IsOptional() @IsInt() @IsIn([1, 2, 3, 4]) practicePart?: ToeicListeningPart;
  @IsInt() activeQuestionId!: number;
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ToeicListeningAnswerDto)
  answers!: ToeicListeningAnswerDto[];
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsInt({ each: true })
  reviewQuestionIds!: number[];
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsInt({ each: true })
  completedMediaIds!: number[];
  @IsOptional() @IsInt() activeMediaId!: number | null;
  @IsInt() playbackPositionMs!: number;
}

class ToeicListeningAnswerDto {
  @IsInt() questionId!: number;
  @IsInt() optionId!: number;
}

export class ToeicListeningSubmissionDto implements ToeicListeningSubmissionPayload {
  @IsUUID() submissionKey!: string;
  @IsInt() testId!: number;
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/)
  listeningSourceVersion!: string;
  @IsOptional() @IsInt() @IsIn([1, 2, 3, 4]) practicePart?: ToeicListeningPart;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ToeicListeningAnswerDto)
  answers!: ToeicListeningAnswerDto[];
}
