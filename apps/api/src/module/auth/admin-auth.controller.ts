import { Body, Controller, Post } from "@nestjs/common";

import { LoginDto } from "./dto/login.dto";
import { LoginUserUseCase } from "./use-cases/login-user.usecase";
import { AuthRateLimit } from "../../common/decorators/auth-rate-limit.decorator";

@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly loginUser: LoginUserUseCase) {}

  @Post("login")
  @AuthRateLimit("login")
  login(@Body() body: LoginDto) {
    return this.loginUser.execute(body, "ADMIN");
  }
}
