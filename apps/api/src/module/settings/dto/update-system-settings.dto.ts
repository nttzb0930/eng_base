import type { UpdateSystemSettingsPayload } from "@repo/shared";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class UpdateSystemSettingsDto implements UpdateSystemSettingsPayload {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  maxHearts?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(50)
  practiceWordsPerLesson?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  weakWordsLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  dailyReviewRelaxedLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  dailyReviewStandardLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(150)
  dailyReviewAcceleratedLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  dailyReviewIntensiveLimit?: number;

  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;
}
