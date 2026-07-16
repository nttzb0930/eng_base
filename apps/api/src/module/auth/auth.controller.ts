import { Body, Controller, Headers, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AuthTokenService } from "./service/auth-token.service";
import { LoginUserUseCase } from "./use-cases/login-user.usecase";
import { LogoutUserUseCase } from "./use-cases/logout-user.usecase";
import { RefreshTokenUseCase } from "./use-cases/refresh-token.usecase";
import { RegisterUserUseCase } from "./use-cases/register-user.usecase";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly loginUser: LoginUserUseCase,
    private readonly registerUser: RegisterUserUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logoutUser: LogoutUserUseCase,
    private readonly tokens: AuthTokenService
  ) {}

  @Post("login")
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
  register(@Body() body: RegisterDto) {
    return this.registerUser.execute(body);
  }

  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const result = await this.refreshToken.execute(
        this.readCookie(request, "client_refresh_token")
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
    const refreshToken = this.readCookie(request, "client_refresh_token");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;
    const result = await this.logoutUser.execute(accessToken, refreshToken);
    this.clearSessionCookies(response);
    return result;
  }

  private setSessionCookies(response: Response, refreshToken: string) {
    const secure = process.env.NODE_ENV === "production";
    response.cookie("client_refresh_token", refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: this.tokens.refreshMaxAgeMs,
    });
    response.cookie("client_has_rt", "1", {
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: this.tokens.refreshMaxAgeMs,
    });
  }

  private setAccessCookie(response: Response, accessToken: string) {
    response.cookie("user_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: this.tokens.accessMaxAgeMs,
    });
  }

  private clearSessionCookies(response: Response) {
    const options = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    response.clearCookie("client_refresh_token", {
      ...options,
      httpOnly: true,
    });
    response.clearCookie("client_has_rt", { ...options, httpOnly: false });
    response.clearCookie("user_token", { ...options, httpOnly: true });
  }

  private readCookie(request: Request, name: string) {
    const cookie = request.headers.cookie
      ?.split(";")
      .map((item) => item.trim().split("="))
      .find(([key]) => key === name);
    return cookie ? decodeURIComponent(cookie.slice(1).join("=")) : undefined;
  }
}
