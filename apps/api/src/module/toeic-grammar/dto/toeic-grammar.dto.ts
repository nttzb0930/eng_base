import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Min,
} from "class-validator";
import type {
  ToeicGrammarAnswerPayload,
  ToeicGrammarPracticeMode,
} from "@repo/shared";

const modes: ToeicGrammarPracticeMode[] = ["topic", "subtopic", "set", "level"];

export class ToeicGrammarPracticeQueryDto {
  @IsIn(modes)
  mode!: ToeicGrammarPracticeMode;

  @IsString()
  @IsNotEmpty()
  target!: string;
}

export class ToeicGrammarAnswerDto implements ToeicGrammarAnswerPayload {
  @IsUUID()
  submissionKey!: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  snapshotVersion!: string;

  @IsIn(modes)
  mode!: ToeicGrammarPracticeMode;

  @IsString()
  @IsNotEmpty()
  target!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  questionId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  selectedOptionId!: number;
}
