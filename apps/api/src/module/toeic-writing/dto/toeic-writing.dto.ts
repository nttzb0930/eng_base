import { Type } from "class-transformer";
import { IsIn, IsInt, IsString, Length, Matches, MaxLength } from "class-validator";
import type { ToeicWritingDraftPayload, ToeicWritingPart } from "@repo/shared";

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
  @MaxLength(10_000)
  responseText!: string;
}
