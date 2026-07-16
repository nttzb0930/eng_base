import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../database/prisma/prisma.module";
import jwtConfig from "../../config/jwt.config";
import { AuthController } from "./auth.controller";
import { AuthTokenService } from "./service/auth-token.service";
import { PasswordService } from "./service/password.service";
import { LoginUserUseCase } from "./use-cases/login-user.usecase";
import { LogoutUserUseCase } from "./use-cases/logout-user.usecase";
import { RefreshTokenUseCase } from "./use-cases/refresh-token.usecase";
import { RegisterUserUseCase } from "./use-cases/register-user.usecase";
import { AdminAuthController } from "./admin-auth.controller";

@Global()
@Module({
  imports: [ConfigModule.forFeature(jwtConfig), PrismaModule],
  controllers: [AuthController, AdminAuthController],
  providers: [
    LoginUserUseCase,
    RegisterUserUseCase,
    RefreshTokenUseCase,
    LogoutUserUseCase,
    AuthTokenService,
    PasswordService,
  ],
  exports: [AuthTokenService, PasswordService],
})
export class AuthModule {}
