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
import { VerifyEmailUseCase } from "./use-cases/verify-email.usecase";
import { ResendVerificationUseCase } from "./use-cases/resend-verification.usecase";
import { RequestPasswordResetUseCase } from "./use-cases/request-password-reset.usecase";
import { ResetPasswordUseCase } from "./use-cases/reset-password.usecase";
import { VerificationCodeService } from "./service/verification-code.service";
import { AdminAuthController } from "./admin-auth.controller";
import { MailModule } from "../mail/mail.module";

@Global()
@Module({
  imports: [ConfigModule.forFeature(jwtConfig), PrismaModule, MailModule],
  controllers: [AuthController, AdminAuthController],
  providers: [
    LoginUserUseCase,
    RegisterUserUseCase,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    RefreshTokenUseCase,
    LogoutUserUseCase,
    AuthTokenService,
    PasswordService,
    VerificationCodeService,
  ],
  exports: [AuthTokenService, PasswordService],
})
export class AuthModule {}
