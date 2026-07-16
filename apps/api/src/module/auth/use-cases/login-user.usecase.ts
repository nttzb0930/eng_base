import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { user_role } from "@prisma/client";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { toAuthUser } from "../auth-user";
import type { LoginDto } from "../dto/login.dto";
import { AuthTokenService } from "../service/auth-token.service";
import { PasswordService } from "../service/password.service";

type ClientLoginResult = {
  accessToken: string;
  refreshToken: string;
  user: ReturnType<typeof toAuthUser>;
};

type AdminLoginResult = {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: user_role;
  };
};

@Injectable()
export class LoginUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AuthTokenService,
    private readonly passwords: PasswordService
  ) {}

  execute(input: LoginDto): Promise<ClientLoginResult>;
  execute(input: LoginDto, requiredRole: "ADMIN"): Promise<AdminLoginResult>;
  async execute(
    input: LoginDto,
    requiredRole?: user_role
  ): Promise<ClientLoginResult | AdminLoginResult> {
    const username = input.username?.trim();
    if (!username || !input.password) {
      if (requiredRole === "ADMIN") {
        throw new UnauthorizedException("INVALID_CREDENTIALS");
      }
      throw new BadRequestException("MISSING_CREDENTIALS");
    }

    const user = await this.prisma.users.findFirst({
      where: {
        OR: [
          { username },
          {
            email: requiredRole === "ADMIN" ? username : username.toLowerCase(),
          },
        ],
      },
    });
    if (
      !user ||
      (requiredRole && user.role !== requiredRole) ||
      !(await this.passwords.verify(input.password, user.password))
    ) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    if (requiredRole === "ADMIN") {
      return {
        token: this.tokens.createAdminCompatibilityToken(user.id, user.role),
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
    }

    const refreshToken = this.tokens.createRefreshToken(user.id, user.role);
    await this.prisma.users.update({
      where: { id: user.id },
      data: { refresh_token: refreshToken },
    });
    return {
      accessToken: this.tokens.createAccessToken(user.id, user.role),
      refreshToken,
      user: toAuthUser(user),
    };
  }
}
