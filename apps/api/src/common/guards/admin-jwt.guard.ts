import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthTokenService } from "../../module/auth";
import { PrismaService } from "../../database/prisma/prisma.service";
import type { Request } from "express";

type AdminAuthenticatedRequest = Request & {
  auth?: {
    userId: string;
    role?: string;
  };
};

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly tokens: AuthTokenService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<AdminAuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!token) {
      throw new UnauthorizedException("TOKEN_INVALID");
    }

    const payload = this.tokens.verifyAccessToken(token);
    if (payload?.userId && payload.role === "ADMIN") {
      // Check if admin user exists in database
      const user = await this.prisma.users.findUnique({
        where: { id: payload.userId },
      });
      if (!user || user.role !== "ADMIN") {
        throw new UnauthorizedException("TOKEN_INVALID");
      }
      request.auth = { userId: payload.userId, role: payload.role };
      return true;
    }

    throw new UnauthorizedException("TOKEN_INVALID");
  }
}
