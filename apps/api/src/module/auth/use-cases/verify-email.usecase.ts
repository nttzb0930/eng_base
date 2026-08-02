import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { authBadRequest } from "../auth-failure";
import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  VerificationCodeService,
} from "../service/verification-code.service";

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: VerificationCodeService
  ) {}

  async execute(input: { email: string; code: string }) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) throw authBadRequest("VERIFICATION_INVALID", "user_not_found");
    if (user.email_verified_at) return { success: true as const };

    if (
      !user.verification_code_hash ||
      !user.verification_code_expires_at ||
      user.verification_code_expires_at.getTime() <= Date.now()
    ) {
      throw authBadRequest("VERIFICATION_EXPIRED", "verification_expired");
    }
    if (user.verification_attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      throw authBadRequest(
        "VERIFICATION_ATTEMPTS_EXCEEDED",
        "verification_attempts_exceeded"
      );
    }

    const valid = await this.codes.verify(
      input.code.trim(),
      user.verification_code_hash
    );
    if (!valid) {
      await this.prisma.users.update({
        where: { id: user.id },
        data: { verification_attempts: { increment: 1 } },
      });
      throw authBadRequest("VERIFICATION_INVALID", "verification_code_invalid");
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        email_verified_at: new Date(),
        verification_code_hash: null,
        verification_code_expires_at: null,
        verification_attempts: 0,
        verification_sent_at: null,
      },
    });
    return { success: true as const };
  }
}
