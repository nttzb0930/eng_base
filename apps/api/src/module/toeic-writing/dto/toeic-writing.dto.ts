import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
} from "class-validator";
import type {
  ToeicWritingDraftPayload,
  ToeicWritingPart,
  ToeicWritingSubmissionPayload,
} from "@repo/shared";

export class ToeicWritingPartQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  part!: ToeicWritingPart;
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
