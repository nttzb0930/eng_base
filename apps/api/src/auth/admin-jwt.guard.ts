import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { verifyJwt } from "./jwt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<any>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!token) {
      throw new UnauthorizedException("TOKEN_INVALID");
    }

    const secret = this.configService.get<string>("jwt.accessSecret") || "your-access-secret-key";
    const payload = verifyJwt(token, secret);
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
