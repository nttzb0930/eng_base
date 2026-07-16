import { Injectable, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { toAuthUser } from "../auth-user";
import { AuthTokenService } from "../service/auth-token.service";

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AuthTokenService
  ) {}

  async execute(refreshToken: string | undefined) {
    const payload = refreshToken
      ? this.tokens.verifyRefreshToken(refreshToken)
      : null;
    if (!refreshToken || !payload?.userId) {
      throw new UnauthorizedException("REFRESH_TOKEN_INVALID");
    }

    const user = await this.prisma.users.findUnique({
      where: { id: payload.userId },
    });
    if (!user || user.refresh_token !== refreshToken) {
      throw new UnauthorizedException("REFRESH_TOKEN_INVALID");
    }

    return {
      accessToken: this.tokens.createAccessToken(user.id, user.role),
      user: toAuthUser(user),
    };
  }
}
