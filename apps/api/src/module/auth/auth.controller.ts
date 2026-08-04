import {
  Body,
  Controller,
  Headers,
  Inject,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import type { Request, Response } from "express";

import { AuthRateLimit } from "../../common/decorators/auth-rate-limit.decorator";
import { AUTH_COOKIE_NAMES } from "../../common/http/auth-cookie.constants";
import { applicationConfig } from "../../config";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { AuthTokenService } from "./service/auth-token.service";
import { LoginUserUseCase } from "./use-cases/login-user.usecase";
import { LogoutUserUseCase } from "./use-cases/logout-user.usecase";
import { RefreshTokenUseCase } from "./use-cases/refresh-token.usecase";
import { RegisterUserUseCase } from "./use-cases/register-user.usecase";
import { ResendVerificationUseCase } from "./use-cases/resend-verification.usecase";
import { RequestPasswordResetUseCase } from "./use-cases/request-password-reset.usecase";
import { ResetPasswordUseCase } from "./use-cases/reset-password.usecase";
import { VerifyEmailUseCase } from "./use-cases/verify-email.usecase";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly loginUser: LoginUserUseCase,
    private readonly registerUser: RegisterUserUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly resendVerification: ResendVerificationUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logoutUser: LogoutUserUseCase,
    private readonly tokens: AuthTokenService,
    @Inject(applicationConfig.KEY)
    private readonly application: ConfigType<typeof applicationConfig>
  ) {}

  @Post("login")
  @AuthRateLimit("login")
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response
  ) {
    const session = await this.loginUser.execute(body);
    this.setSessionCookies(response, session.refreshToken);
    this.setAccessCookie(response, session.accessToken);
    return { access_token: session.accessToken, user: session.user };
  }

  @Post("register")
  @AuthRateLimit("register")
  register(@Body() body: RegisterDto) {
    return this.registerUser.execute(body);
  }

  @Post("verify-email")
  verify(@Body() body: VerifyEmailDto) {
    return this.verifyEmail.execute(body);
  }

  @Post("resend-verification")
  resend(@Body() body: ResendVerificationDto) {
    return this.resendVerification.execute(body);
  }

  @Post("forgot-password")
  requestReset(@Body() body: RequestPasswordResetDto) {
    return this.requestPasswordReset.execute(body);
  }

  @Post("reset-password")
  reset(@Body() body: ResetPasswordDto) {
    return this.resetPassword.execute(body);
  }

  @Post("refresh")
  @AuthRateLimit("refresh")
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const result = await this.refreshToken.execute(
        this.readCookie(request, AUTH_COOKIE_NAMES.refresh)
      );
      this.setAccessCookie(response, result.accessToken);
      return { access_token: result.accessToken, user: result.user };
    } catch (error) {
      this.clearSessionCookies(response);
      throw error;
    }
  }

  @Post("logout")
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers("authorization") authorization?: string
  ) {
    const refreshToken = this.readCookie(request, AUTH_COOKIE_NAMES.refresh);
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;
    const result = await this.logoutUser.execute(accessToken, refreshToken);
    this.clearSessionCookies(response);
    return result;
  }

  private setSessionCookies(response: Response, refreshToken: string) {
    const secure = this.application.isProduction;
    response.cookie(AUTH_COOKIE_NAMES.refresh, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: this.tokens.refreshMaxAgeMs,
    });
    response.cookie(AUTH_COOKIE_NAMES.refreshMarker, "1", {
      httpOnly: false,
      secure,
      sameSite: "lax",
      domain: this.application.authCookieDomain,
      path: "/",
      maxAge: this.tokens.refreshMaxAgeMs,
    });
  }

  private setAccessCookie(response: Response, accessToken: string) {
    response.cookie(AUTH_COOKIE_NAMES.access, accessToken, {
      httpOnly: true,
      secure: this.application.isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: this.tokens.accessMaxAgeMs,
    });
  }

  private clearSessionCookies(response: Response) {
    const options = {
      secure: this.application.isProduction,
      sameSite: "lax" as const,
      path: "/",
    };
    response.clearCookie(AUTH_COOKIE_NAMES.refresh, {
      ...options,
      httpOnly: true,
    });
    response.clearCookie(AUTH_COOKIE_NAMES.refreshMarker, {
      ...options,
      httpOnly: false,
      domain: this.application.authCookieDomain,
    });
    response.clearCookie(AUTH_COOKIE_NAMES.access, {
      ...options,
      httpOnly: true,
    });
  }

  private readCookie(request: Request, name: string) {
    const cookie = request.headers.cookie
      ?.split(";")
      .map((item) => item.trim().split("="))
      .find(([key]) => key === name);
    return cookie ? decodeURIComponent(cookie.slice(1).join("=")) : undefined;
  }
}
