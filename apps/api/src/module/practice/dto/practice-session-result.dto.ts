import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum } from "class-validator";
import { Type } from "class-transformer";

export enum PracticeSessionMode {
  LESSON = "lesson",
  FILL_BLANK = "fill_blank",
  LISTENING = "listening",
  DICTATION = "dictation",
  WEAK_WORDS = "weak_words",
  DAILY_REVIEW = "daily_review",
  SAVED_WORDS = "saved_words",
  FLASHCARDS = "flashcards",
}

export class PracticeSessionResultItemDto {
  @IsNumber()
  @IsNotEmpty()
  vocabularyItemId!: number;

  @IsString()
  @IsNotEmpty()
  challengeType!: string;

  @IsBoolean()
  @IsNotEmpty()
  correct!: boolean;

  @IsString()
  @IsOptional()
  answer?: string;
}

export class PracticeSessionResultInputDto {
  @IsEnum(PracticeSessionMode)
  @IsNotEmpty()
  mode!: PracticeSessionMode;

  @IsArray()
  @IsNotEmpty()
  @Type(() => PracticeSessionResultItemDto)
  items!: PracticeSessionResultItemDto[];
}
