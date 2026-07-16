import { IsOptional, IsString } from "class-validator";

import { LoginDto } from "./login.dto";

export class RegisterDto extends LoginDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}
