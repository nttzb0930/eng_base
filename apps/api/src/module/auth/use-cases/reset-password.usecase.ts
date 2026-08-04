import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { authBadRequest } from "../auth-failure";
import { PasswordService } from "../service/password.service";
import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  VerificationCodeService,
} from "../service/verification-code.service";

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: VerificationCodeService,
    private readonly passwords: PasswordService
  ) {}

  async execute(input: { email: string; code: string; newPassword: string }) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) {
      throw authBadRequest("PASSWORD_RESET_INVALID", "user_not_found");
    }
    if (
      !user.password_reset_code_hash ||
      !user.password_reset_code_expires_at ||
      user.password_reset_code_expires_at.getTime() <= Date.now()
    ) {
      throw authBadRequest("PASSWORD_RESET_EXPIRED", "password_reset_expired");
    }
    if (user.password_reset_attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      throw authBadRequest(
        "PASSWORD_RESET_ATTEMPTS_EXCEEDED",
        "password_reset_attempts_exceeded"
      );
    }

    const valid = await this.codes.verify(
      input.code.trim(),
      user.password_reset_code_hash
    );
    if (!valid) {
      await this.prisma.users.update({
        where: { id: user.id },
        data: { password_reset_attempts: { increment: 1 } },
      });
      throw authBadRequest(
        "PASSWORD_RESET_INVALID",
        "password_reset_code_invalid"
      );
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        password: await this.passwords.hash(input.newPassword),
        refresh_token: null,
        password_reset_code_hash: null,
        password_reset_code_expires_at: null,
        password_reset_attempts: 0,
        password_reset_sent_at: null,
      },
    });
    return { success: true as const };
  }
}
