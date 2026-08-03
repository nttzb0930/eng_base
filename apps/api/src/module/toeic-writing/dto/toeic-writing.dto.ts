import { Type } from "class-transformer";
import { IsIn, IsInt } from "class-validator";
import type { ToeicWritingPart } from "@repo/shared";

export class ToeicWritingPartQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  part!: ToeicWritingPart;
}
