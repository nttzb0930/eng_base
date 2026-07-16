import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { AuthTokenService } from "../service/auth-token.service";

@Injectable()
export class LogoutUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AuthTokenService
  ) {}

  async execute(accessToken?: string, refreshToken?: string) {
    const payload = accessToken
      ? this.tokens.verifyAccessToken(accessToken)
      : refreshToken
        ? this.tokens.verifyRefreshToken(refreshToken)
        : null;
    if (payload?.userId) {
      await this.prisma.users.updateMany({
        where: { id: payload.userId },
        data: { refresh_token: null },
      });
    }
    return { success: true as const };
  }
}
