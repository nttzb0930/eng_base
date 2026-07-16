import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import type { Request, Response } from "express";
import jwtConfig from "../../config/jwt.config";
import { PrismaService } from "../../database/prisma/prisma.service";
import { hashPassword, verifyPassword } from "./password";
import { signJwt, verifyJwt } from "./jwt";

type CredentialsBody = { username?: string; password?: string };
type RegisterBody = CredentialsBody & { email?: string; fullName?: string };
type TokenPayload = { userId: string; role: string };

const ACCESS_SECONDS = 15 * 60;
const REFRESH_SECONDS = 7 * 24 * 60 * 60;

@Controller("auth")
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
  ) {}

  @Post("login")
  async login(
    @Body() body: CredentialsBody,
    @Res({ passthrough: true }) response: Response,
  ) {
    const username = body.username?.trim();
    if (!username || !body.password) {
      throw new BadRequestException("MISSING_CREDENTIALS");
    }

    const user = await this.prisma.users.findFirst({
      where: { OR: [{ username }, { email: username.toLowerCase() }] },
    });
    if (!user || !(await verifyPassword(body.password, user.password))) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    return this.createSession(response, user);
  }

  @Post("register")
  async register(@Body() body: RegisterBody) {
    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const fullName = body.fullName?.trim();
    if (!username || !email || !body.password || !fullName) {
      throw new BadRequestException("MISSING_FIELDS");
    }

    const existing = await this.prisma.users.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) throw new BadRequestException("USER_ALREADY_EXISTS");

    await this.prisma.users.create({
      data: {
        username,
        email,
        full_name: fullName,
        password: await hashPassword(body.password),
        role: "USER",
      },
    });
    return { success: true };
  }

  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.readCookie(request, "client_refresh_token");
    const payload = refreshToken
      ? (verifyJwt(refreshToken, this.jwtCfg.refreshSecret) as TokenPayload | null)
      : null;
    if (!refreshToken || !payload) {
      this.clearSessionCookies(response);
      throw new UnauthorizedException("REFRESH_TOKEN_INVALID");
    }

    const user = await this.prisma.users.findUnique({ where: { id: payload.userId } });
    if (!user || user.refresh_token !== refreshToken) {
      this.clearSessionCookies(response);
      throw new UnauthorizedException("REFRESH_TOKEN_INVALID");
    }

    const accessToken = this.createAccessToken(user.id, user.role);
    this.setAccessCookie(response, accessToken);
    return {
      access_token: accessToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, fullName: user.full_name },
    };
  }

  @Post("logout")
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers("authorization") authorization?: string,
  ) {
    const refreshToken = this.readCookie(request, "client_refresh_token");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;
    const payload = accessToken
      ? (verifyJwt(accessToken, this.jwtCfg.accessSecret) as TokenPayload | null)
      : refreshToken
        ? (verifyJwt(refreshToken, this.jwtCfg.refreshSecret) as TokenPayload | null)
        : null;

    if (payload) {
      await this.prisma.users.updateMany({
        where: { id: payload.userId },
        data: { refresh_token: null },
      });
    }
    this.clearSessionCookies(response);
    return { success: true };
  }

  private async createSession(
    response: Response,
    user: { id: string; username: string; email: string; role: string; full_name: string },
  ) {
    const refreshToken = signJwt(
      { userId: user.id, role: user.role },
      this.jwtCfg.refreshSecret,
      REFRESH_SECONDS,
    );
    await this.prisma.users.update({
      where: { id: user.id },
      data: { refresh_token: refreshToken },
    });
    const accessToken = this.createAccessToken(user.id, user.role);
    this.setSessionCookies(response, refreshToken);
    this.setAccessCookie(response, accessToken);

    return {
      access_token: accessToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, fullName: user.full_name },
    };
  }

  private createAccessToken(userId: string, role: string) {
    return signJwt(
      { userId, role },
      this.jwtCfg.accessSecret,
      ACCESS_SECONDS,
    );
  }

  private setSessionCookies(response: Response, refreshToken: string) {
    const secure = process.env.NODE_ENV === "production";
    response.cookie("client_refresh_token", refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_SECONDS * 1000,
    });
    response.cookie("client_has_rt", "1", {
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_SECONDS * 1000,
    });
  }

  private setAccessCookie(response: Response, accessToken: string) {
    response.cookie("user_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_SECONDS * 1000,
    });
  }

  private clearSessionCookies(response: Response) {
    const options = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    response.clearCookie("client_refresh_token", { ...options, httpOnly: true });
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
