import { Body, Controller, Post } from "@nestjs/common";

import { LoginDto } from "./dto/login.dto";
import { LoginUserUseCase } from "./use-cases/login-user.usecase";

@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly loginUser: LoginUserUseCase) {}

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.loginUser.execute(body, "ADMIN");
  }
}
