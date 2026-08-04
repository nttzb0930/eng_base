import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { READING_SOURCE_CANDIDATE_STATUSES } from "@repo/shared";

import { ReadingPassageCreateDto } from "./reading.dto";

export class ReadingSourceCandidateQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @IsIn(READING_SOURCE_CANDIDATE_STATUSES)
  @IsOptional()
  status?: "PENDING" | "CONVERTED" | "REJECTED";

  @IsIn(["1", "2"])
  @IsOptional()
  sourceLevel?: "1" | "2";

  @IsString()
  @IsOptional()
  search?: string;
}

export class ConvertReadingSourceCandidateDto extends ReadingPassageCreateDto {}

export class RejectReadingSourceCandidateDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
