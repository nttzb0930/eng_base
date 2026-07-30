import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from "class-validator";
import {
  READING_CEFR_LEVELS,
  type CreateReadingPassagePayload,
  type ReadingCefrLevel,
  type ReadingOptionInput,
  type ReadingQuestionInput,
  type UpdateReadingPassagePayload,
} from "@repo/shared";

export class ReadingOptionInputDto implements ReadingOptionInput {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsInt()
  @Min(1)
  order!: number;

  @IsBoolean()
  correct!: boolean;
}

export class ReadingQuestionInputDto implements ReadingQuestionInput {
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsInt()
  @Min(1)
  order!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReadingOptionInputDto)
  options!: ReadingOptionInputDto[];
}

class ReadingPassageContentDto implements UpdateReadingPassagePayload {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsIn(READING_CEFR_LEVELS)
  cefrLevel!: ReadingCefrLevel;

  @IsInt()
  @IsOptional()
  topicId!: number | null;

  @IsInt()
  @Min(1)
  estimatedMinutes!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReadingQuestionInputDto)
  questions!: ReadingQuestionInputDto[];
}

export class ReadingPassageCreateDto
  extends ReadingPassageContentDto
  implements CreateReadingPassagePayload
{
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
}

export class ReadingPassageUpdateDto extends ReadingPassageContentDto {}

export class ReadingLevelQueryDto {
  @IsIn(READING_CEFR_LEVELS)
  @IsOptional()
  level: ReadingCefrLevel = "A1";
}
