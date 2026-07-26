import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";

export class FlashcardSessionQueryDto {
  @IsOptional()
  @IsString()
  deck?: string;

  @IsOptional()
  @IsIn(["topic"])
  source?: "topic";

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  slug?: string;
}
