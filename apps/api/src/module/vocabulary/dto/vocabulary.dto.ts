import { IsBoolean, IsNotEmpty, IsEnum } from "class-validator";

export enum FlashcardRating {
  AGAIN = "again",
  GOOD = "good",
}

export class RecordReviewResultDto {
  @IsBoolean()
  @IsNotEmpty()
  correct!: boolean;
}

export class RecordFlashcardRatingDto {
  @IsEnum(FlashcardRating)
  @IsNotEmpty()
  rating!: FlashcardRating;
}
