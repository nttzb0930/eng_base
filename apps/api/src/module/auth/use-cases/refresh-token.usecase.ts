import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { authUnauthorized } from "../auth-failure";
import { toAuthUser } from "../auth-user";
import { AuthTokenService } from "../service/auth-token.service";

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AuthTokenService
  ) {}

  async execute(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw authUnauthorized("REFRESH_TOKEN_INVALID", "refresh_token_missing");
    }
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    if (!payload?.userId) {
      throw authUnauthorized(
        "REFRESH_TOKEN_INVALID",
        "refresh_token_malformed"
      );
    }

    const user = await this.prisma.users.findUnique({
      where: { id: payload.userId },
    });
    if (!user) {
      throw authUnauthorized("REFRESH_TOKEN_INVALID", "user_not_found");
    }
    if (user.refresh_token !== refreshToken) {
      throw authUnauthorized("REFRESH_TOKEN_INVALID", "session_mismatch");
    }

    return {
      accessToken: this.tokens.createAccessToken(user.id, user.role),
      user: toAuthUser(user),
    };
  }
}
